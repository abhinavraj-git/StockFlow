const express = require("express");
const User = require("../models/User");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", authorizeRoles("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch users." });
  }
});

router.patch("/:id/role", authorizeRoles("admin"), async (req, res) => {
  try {
    const { role } = req.body;

    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    if (req.user.userId === req.params.id) {
      return res.status(400).json({
        message: "You cannot change your own role.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Could not update user role." });
  }
});
module.exports = router;
