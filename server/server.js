require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const productRoutes = require("./routes/products");
const transactionRoutes = require("./routes/transactions");
const authRoutes = require("./routes/auth");
const protect = require("./middleware/authMiddleware");
const userRoutes = require("./routes/users");
const { connectRedis } = require("./config/redis");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());
app.use("/api/products", protect, productRoutes);
app.use("/api/transactions", protect, transactionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", protect, userRoutes);

app.get("/", (req, res) => {
  res.json({ message: "StockFlow API is running!" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");

    await connectRedis();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });
