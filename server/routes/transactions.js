const express = require("express");
const StockTransaction = require("../models/StockTransaction");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const transactions = await StockTransaction.find()
      .populate("product", "name sku")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch transactions." });
  }
});

module.exports = router;