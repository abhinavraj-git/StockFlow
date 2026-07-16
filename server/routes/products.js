const express = require("express");
const Product = require("../models/Product");
const StockTransaction = require("../models/StockTransaction");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch products" });
  }
});

// Add a product
router.post("/", authorizeRoles("admin"), async (req, res) => {
  try {
    const { initialNote, ...productData } = req.body;

    const product = await Product.create(productData);

    if (product.quantity > 0) {
      await StockTransaction.create({
        product: product._id,
        performedBy: req.user.userId,
        type: "IN",
        quantity: product.quantity,
        note: initialNote || "Initial stock",
      });
    }

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

    res.json(product);
  } catch (error) {
    res.status(400).json({
      message: "Could not update product.",
      error: error.message,
    });
  }
});

module.exports = router;
