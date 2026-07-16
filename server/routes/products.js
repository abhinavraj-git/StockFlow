const express = require("express");
const Product = require("../models/Product");
const StockTransaction = require("../models/StockTransaction");
const authorizeRoles = require("../middleware/roleMiddleware");
const {
  getCache,
  setCache,
  getProductCacheVersion,
  invalidateProductCache,
} = require("../config/redis");

const router = express.Router();

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Get paginated products with optional search and filters.
router.get("/", async (req, res) => {
  try {
    const cacheVersion = await getProductCacheVersion();
    const cacheKey = `products:${cacheVersion}:${req.originalUrl}`;
    const cachedProducts = await getCache(cacheKey);

    if (cachedProducts) {
      return res.json(cachedProducts);
    }

    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isNaN(requestedPage) ? 1 : Math.max(requestedPage, 1);
    const limit = Number.isNaN(requestedLimit)
      ? 8
      : Math.min(Math.max(requestedLimit, 1), 1000);
    const search = req.query.search?.trim() || "";
    const category = req.query.category || "all";
    const lowStockOnly = req.query.lowStock === "true";
    const filter = {};

    if (search) {
      const searchPattern = escapeRegex(search);
      filter.$or = [
        { name: { $regex: searchPattern, $options: "i" } },
        { sku: { $regex: searchPattern, $options: "i" } },
        { category: { $regex: searchPattern, $options: "i" } },
      ];
    }

    if (category !== "all") {
      filter.category = category;
    }

    if (lowStockOnly) {
      filter.$expr = { $lte: ["$quantity", "$reorderLevel"] };
    }

    const skip = (page - 1) * limit;

    const [products, totalProducts, categories, summaryRows, lowStockCount] =
      await Promise.all([
        Product.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
        Product.distinct("category"),
        Product.aggregate([
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              totalUnits: { $sum: "$quantity" },
              inventoryValue: {
                $sum: { $multiply: ["$price", "$quantity"] },
              },
            },
          },
        ]),
        Product.countDocuments({
          $expr: { $lte: ["$quantity", "$reorderLevel"] },
        }),
      ]);

    const totalPages = Math.max(Math.ceil(totalProducts / limit), 1);
    const summary = summaryRows[0] || {
      totalProducts: 0,
      totalUnits: 0,
      inventoryValue: 0,
    };

    const response = {
      products,
      pagination: {
        page,
        limit,
        totalProducts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      summary: {
        totalProducts: summary.totalProducts,
        totalUnits: summary.totalUnits,
        lowStockCount,
        inventoryValue: summary.inventoryValue,
      },
      categories: categories.filter(Boolean).sort(),
    };

    await setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch products" });
  }
});

// Add a product
router.post("/", authorizeRoles("admin"), async (req, res) => {
  try {
    const { initialStockNote, ...productData } = req.body;

    const product = await Product.create(productData);

    if (product.quantity > 0) {
      await StockTransaction.create({
        product: product._id,
        performedBy: req.user.userId,
        type: "IN",
        quantity: product.quantity,
        note: initialStockNote?.trim() || "Initial stock",
      });
    }

    await invalidateProductCache();

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({
      message: "Could not create product",
      error: error.message,
    });
  }
});

router.post("/:id/stock", async (req, res) => {
  try {
    const { type, quantity, note } = req.body;
    const amount = Number(quantity);

    if (!["IN", "OUT"].includes(type) || amount <= 0) {
      return res.status(400).json({
        message: "Type must be IN or OUT, and quantity must be greater than 0.",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (type === "OUT" && product.quantity < amount) {
      return res.status(400).json({
        message: "Not enough stock available.",
      });
    }

    if (type === "IN") {
      product.quantity += amount;
    } else {
      product.quantity -= amount;
    }

    await product.save();

    const transaction = await StockTransaction.create({
      product: product._id,
      performedBy: req.user.userId,
      type,
      quantity: amount,
      note,
    });

    await invalidateProductCache();

    res.json({
      message: "Stock updated successfully.",
      product,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not update stock." });
  }
});

router.delete("/:id", authorizeRoles("admin"), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    await invalidateProductCache();

    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete product." });
  }
});

router.put("/:id", authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, sku, category, price, reorderLevel, description } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        sku,
        category,
        price,
        reorderLevel,
        description,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    await invalidateProductCache();

    res.json(product);
  } catch (error) {
    res.status(400).json({
      message: "Could not update product.",
      error: error.message,
    });
  }
});

module.exports = router;
