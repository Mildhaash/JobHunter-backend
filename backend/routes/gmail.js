const express = require("express");
const authenticate = require("../middleware/auth");
const User = require("../models/User");
const Application = require("../models/Application");
const { getAuthUrl, handleCallback, fetchRecentEmails } = require("../services/gmailService");

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// GET /api/gmail/connect — returns Google OAuth URL
router.get("/connect", authenticate, (req, res) => {
  try {
    const url = getAuthUrl(req.user._id.toString());
    res.json({ url });
  } catch (err) {
    console.error("Gmail connect error:", err);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

// GET /api/gmail/callback — handles Google OAuth callback
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${CLIENT_URL}/dashboard/dashboard.html?gmail=error`);
    }

    const tokens = await handleCallback(code);

    const user = await User.findById(state);
    if (!user) {
      return res.redirect(`${CLIENT_URL}/dashboard/dashboard.html?gmail=error`);
    }

    user.gmail.accessToken = tokens.accessToken;
    user.gmail.refreshToken = tokens.refreshToken;
    user.gmail.email = tokens.email;
    user.gmail.lastSyncAt = new Date();
    await user.save();

    res.redirect(`${CLIENT_URL}/dashboard/dashboard.html?gmail=connected`);
  } catch (err) {
    console.error("Gmail callback error:", err);
    res.redirect(`${CLIENT_URL}/dashboard/dashboard.html?gmail=error`);
  }
});

// GET /api/gmail/status — check if Gmail is connected
router.get("/status", authenticate, (req, res) => {
  const gmail = req.user.gmail || {};
  res.json({
    connected: !!(gmail.refreshToken),
    email: gmail.email || "",
    lastSyncAt: gmail.lastSyncAt || null,
  });
});

// POST /api/gmail/disconnect — disconnect Gmail
router.post("/disconnect", authenticate, async (req, res) => {
  try {
    req.user.gmail = { accessToken: "", refreshToken: "", email: "", historyId: "", lastSyncAt: null };
    await req.user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Gmail disconnect error:", err);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// POST /api/gmail/sync — fetch recent emails and parse with AI
router.post("/sync", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const emails = await fetchRecentEmails(userId, 10);

    if (emails.length === 0) {
      return res.json({ synced: 0, message: "No recent emails found" });
    }

    const { AI_PARSER_URL, AI_PARSER_API_KEY } = process.env;
    if (!AI_PARSER_URL || !AI_PARSER_API_KEY) {
      return res.status(500).json({ error: "AI parser not configured" });
    }

    const existing = await Application.find({ userId, source: "email" }).select("emailSubject emailFrom");
    const existingKeys = new Set(existing.map((e) => `${e.emailSubject}|||${e.emailFrom}`));

    const newEmails = emails.filter((e) => !existingKeys.has(`${e.subject}|||${e.from}`));

    if (newEmails.length === 0) {
      return res.json({ synced: 0, message: "No new job emails to process" });
    }

    let synced = 0;
    const results = [];

    for (const email of newEmails) {
      try {
        const aiRes = await fetch(`${AI_PARSER_URL}/parse-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": AI_PARSER_API_KEY,
            "X-User-Id": userId.toString(),
          },
          body: JSON.stringify({
            subject: email.subject,
            from: email.from,
            body: email.body || email.snippet,
          }),
        });

        if (aiRes.ok) {
          const parsed = await aiRes.json();
          if (parsed.company && parsed.role) {
            await Application.create({
              userId,
              company: parsed.company,
              role: parsed.role,
              status: parsed.status || "Applied",
              location: parsed.location || "",
              date: new Date().toISOString().split("T")[0],
              source: "email",
              emailSubject: email.subject,
              emailFrom: email.from,
              jobUrl: parsed.jobUrl || "",
            });
            synced++;
            results.push({ subject: email.subject, company: parsed.company, role: parsed.role });
          }
        }
      } catch (err) {
        continue;
      }
    }

    const user = await User.findById(userId);
    user.gmail.lastSyncAt = new Date();
    await user.save();

    res.json({ synced, total: newEmails.length, results });
  } catch (err) {
    console.error("Gmail sync error:", err);
    res.status(500).json({ error: "Failed to sync emails" });
  }
});

module.exports = router;
