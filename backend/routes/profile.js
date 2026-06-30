const express = require("express");
const User = require("../models/User");
const authenticate = require("../middleware/auth");

const router = express.Router();

// GET /api/profile
router.get("/", authenticate, async (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, image: req.user.image || "" });
});

// PUT /api/profile
router.put("/", authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
    if (!email || !email.trim()) return res.status(400).json({ error: "email is required" });
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const emailLower = email.trim().toLowerCase();
    const existing = await User.findOne({ email: emailLower, _id: { $ne: req.userId } });
    if (existing) {
      return res.status(409).json({ error: "This email is already in use" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name: name.trim(), email: emailLower },
      { new: true }
    );

    res.json({ name: user.name, email: user.email, image: user.image || "" });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
