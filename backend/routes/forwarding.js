const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const authenticate = require("../middleware/auth");

const router = express.Router();

function generateMailgunAddress() {
  const random = crypto.randomBytes(6).toString("hex");
  const domain = process.env.MAILGUN_DOMAIN || "sandbox0aca76da77084d66b11157eebb701b63.mailgun.org";
  return `jobh-${random}@${domain}`;
}

router.get("/address", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.forwardingAddress) {
      user.forwardingAddress = generateMailgunAddress();
      await user.save();
    }
    res.json({ address: user.forwardingAddress });
  } catch (err) {
    res.status(500).json({ error: "Failed to get forwarding address" });
  }
});

router.post("/generate", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.forwardingAddress = generateMailgunAddress();
    await user.save();
    res.json({ address: user.forwardingAddress });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate address" });
  }
});

router.get("/lookup", async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "address query param required" });
    const user = await User.findOne({ forwardingAddress: address });
    if (!user) return res.status(404).json({ error: "Address not found" });
    res.json({ userId: user._id });
  } catch (err) {
    res.status(500).json({ error: "Lookup failed" });
  }
});

module.exports = router;
