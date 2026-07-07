const express = require("express");
const authenticate = require("../middleware/auth");
const User = require("../models/User");
const Application = require("../models/Application");

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const AI_PARSER_URL = process.env.AI_PARSER_URL;
const AI_PARSER_API_KEY = process.env.AI_PARSER_API_KEY;

// GET /api/gmail/status — check Gmail sync status
router.get("/status", authenticate, (req, res) => {
  const user = req.user;
  const hasForwarding = !!(user.forwardingAddress);
  const gmail = user.gmail || {};
  res.json({
    connected: hasForwarding,
    mode: hasForwarding ? "forwarding" : "none",
    forwardingAddress: user.forwardingAddress || "",
    lastSyncAt: gmail.lastSyncAt || null,
    verificationUrl: gmail.verificationUrl || "",
    gmailStatus: gmail.status || "none",
  });
});

// POST /api/gmail/connect — generate a unique forwarding address
router.post("/connect", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.forwardingAddress) {
      const crypto = require("crypto");
      const random = crypto.randomBytes(6).toString("hex");
      const domain = process.env.MAILGUN_DOMAIN || "sandbox0aca76da77084d66b11157eebb701b63.mailgun.org";
      user.forwardingAddress = `jobh-${random}@${domain}`;
      await user.save();
    }
    res.json({ address: user.forwardingAddress });
  } catch (err) {
    console.error("Gmail connect error:", err);
    res.status(500).json({ error: "Failed to generate forwarding address" });
  }
});

// POST /api/gmail/disconnect — clear forwarding address
router.post("/disconnect", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.forwardingAddress = "";
    user.gmail = { accessToken: "", refreshToken: "", email: "", historyId: "", lastSyncAt: null, verificationUrl: "", status: "" };
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Gmail disconnect error:", err);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// POST /api/gmail/verify — user clicked the verification link
router.post("/verify", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.gmail = user.gmail || {};
    user.gmail.status = "verified";
    user.gmail.verificationUrl = "";
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Gmail verify error:", err);
    res.status(500).json({ error: "Failed to verify" });
  }
});

// POST /api/gmail/webhook — receives forwarded emails from Mailgun
router.post("/webhook", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const recipient = req.body.recipient || "";
    const sender = req.body.sender || req.body.From || "";
    const subject = req.body.subject || req.body.Subject || "";
    const bodyPlain = req.body["body-plain"] || req.body["body-plain"] || "";
    const bodyHtml = req.body["body-html"] || req.body["body-html"] || "";

    if (!recipient) {
      return res.status(400).json({ error: "No recipient" });
    }

    const user = await User.findOne({ forwardingAddress: recipient });
    if (!user) {
      return res.status(404).json({ error: "Unknown forwarding address" });
    }

    const body = bodyPlain || bodyHtml || "";

    const isGmailVerification =
      sender === "forwarding-noreply@google.com" ||
      (subject && subject.toLowerCase().includes("forwarding confirmation")) ||
      (subject && subject.toLowerCase().includes("gmail forwarding"));

    if (isGmailVerification) {
      const linkMatch = body.match(/https:\/\/mail\.google\.com\/mail\/[^\s"<>]+/);
      const htmlLinkMatch = (bodyHtml || "").match(/https:\/\/mail\.google\.com\/mail\/[^\s"<>]+/);
      const verifyUrl = linkMatch?.[0] || htmlLinkMatch?.[0] || "";

      user.gmail = user.gmail || {};
      user.gmail.verificationUrl = verifyUrl;
      user.gmail.status = "pending_verification";
      await user.save();

      console.log(`Gmail verification email received for user ${user._id}, link stored`);
      return res.status(200).json({ success: true, type: "verification", stored: true });
    }

    if (!body && !subject) {
      return res.status(200).json({ skipped: true, reason: "Empty email" });
    }

    const existing = await Application.findOne({
      userId: user._id,
      source: "email",
      emailSubject: subject,
      emailFrom: sender,
    });
    if (existing) {
      return res.status(200).json({ skipped: true, reason: "Already processed" });
    }

    if (!AI_PARSER_URL || !AI_PARSER_API_KEY) {
      return res.status(500).json({ error: "AI parser not configured" });
    }

    const aiRes = await fetch(`${AI_PARSER_URL}/parse-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": AI_PARSER_API_KEY,
        "X-User-Id": user._id.toString(),
      },
      body: JSON.stringify({ subject, from: sender, body }),
    });

    if (!aiRes.ok) {
      return res.status(500).json({ error: "AI parser failed" });
    }

    const parsed = await aiRes.json();
    if (!parsed.company || !parsed.role) {
      return res.status(200).json({ skipped: true, reason: "Not a job-related email" });
    }

    const application = await Application.create({
      userId: user._id,
      company: parsed.company,
      role: parsed.role,
      status: parsed.status || "Applied",
      location: parsed.location || "",
      date: new Date().toISOString().split("T")[0],
      source: "email",
      emailSubject: subject,
      emailFrom: sender,
      jobUrl: parsed.jobUrl || "",
    });

    user.gmail = user.gmail || {};
    user.gmail.lastSyncAt = new Date();
    user.gmail.status = "verified";
    await user.save();

    res.json({ success: true, application });
  } catch (err) {
    console.error("Gmail webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gmail/sync — manually trigger a sync (for forwarding mode, just returns status)
router.post("/sync", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.forwardingAddress) {
      return res.status(400).json({ error: "Gmail not connected. Set up forwarding first." });
    }

    const recentApps = await Application.find({
      userId: req.userId,
      source: "email",
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      synced: 0,
      message: "Emails are auto-synced when forwarded to your address",
      forwardingAddress: user.forwardingAddress,
      recentApplications: recentApps,
    });
  } catch (err) {
    console.error("Gmail sync error:", err);
    res.status(500).json({ error: "Failed to sync" });
  }
});

module.exports = router;
