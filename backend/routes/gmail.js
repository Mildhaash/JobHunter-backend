const express = require("express");
const authenticate = require("../middleware/auth");
const User = require("../models/User");
const { getAuthUrl, handleCallback, fetchRecentEmails } = require("../services/gmailService");
const { callAIParser, findDuplicate, createApplicationFromEmail, isConfigured } = require("../helpers/emailHelper");

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// GET /api/gmail/status
router.get("/status", authenticate, (req, res) => {
  const gmail = req.user.gmail || {};
  res.json({
    connected: !!(gmail.refreshToken),
    email: gmail.email || "",
    lastSyncAt: gmail.lastSyncAt || null,
  });
});

// POST /api/gmail/parse — paste an email and AI extracts the job application
router.post("/parse", authenticate, async (req, res) => {
  try {
    const { subject, from, body } = req.body;
    if (!body && !subject) {
      return res.status(400).json({ error: "Paste an email content (subject, from, or body)" });
    }
    if (!isConfigured()) {
      return res.status(500).json({ error: "AI parser not configured" });
    }

    const parsed = await callAIParser(subject, from, body, req.userId);
    if (!parsed || !parsed.company || !parsed.role) {
      return res.json({ found: false, message: "This doesn't look like a job-related email" });
    }

    const existing = await findDuplicate(req.userId, subject, from);
    if (existing) {
      return res.json({ found: false, message: "This email was already added", application: existing });
    }

    const application = await createApplicationFromEmail(req.userId, parsed, subject, from);

    const user = await User.findById(req.userId);
    user.gmail = user.gmail || {};
    user.gmail.lastSyncAt = new Date();
    await user.save();

    res.json({ found: true, application });
  } catch (err) {
    console.error("Gmail parse error:", err);
    res.status(500).json({ error: "Failed to parse email" });
  }
});

// POST /api/gmail/parse-batch — paste multiple emails at once
router.post("/parse-batch", authenticate, async (req, res) => {
  try {
    const { emails } = req.body;
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "Provide an array of emails" });
    }
    if (!isConfigured()) {
      return res.status(500).json({ error: "AI parser not configured" });
    }

    let synced = 0;
    const results = [];

    for (const email of emails) {
      try {
        const parsed = await callAIParser(email.subject, email.from, email.body, req.userId);
        if (!parsed || !parsed.company || !parsed.role) continue;

        const existing = await findDuplicate(req.userId, email.subject, email.from);
        if (existing) continue;

        await createApplicationFromEmail(req.userId, parsed, email.subject, email.from);
        synced++;
        results.push({ subject: email.subject, company: parsed.company, role: parsed.role });
      } catch {
        continue;
      }
    }

    const user = await User.findById(req.userId);
    user.gmail = user.gmail || {};
    user.gmail.lastSyncAt = new Date();
    await user.save();

    res.json({ synced, total: emails.length, results });
  } catch (err) {
    console.error("Gmail batch parse error:", err);
    res.status(500).json({ error: "Failed to parse emails" });
  }
});

// GET /api/gmail/auth — generate Google OAuth URL
router.get("/auth", authenticate, (req, res) => {
  try {
    const url = getAuthUrl(req.userId.toString());
    res.json({ url });
  } catch (err) {
    console.error("Gmail auth error:", err);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

// GET /api/gmail/callback — handle OAuth callback, save tokens, redirect to dashboard
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${FRONTEND_URL}/dashboard/dashboard.html?gmail=error&msg=No+code+received`);
    }

    const tokens = await handleCallback(code);
    const userId = state;

    if (!userId) {
      return res.redirect(`${FRONTEND_URL}/dashboard/dashboard.html?gmail=error&msg=Missing+user+ID`);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${FRONTEND_URL}/dashboard/dashboard.html?gmail=error&msg=User+not+found`);
    }

    user.gmail = user.gmail || {};
    user.gmail.accessToken = tokens.accessToken;
    user.gmail.refreshToken = tokens.refreshToken;
    user.gmail.email = tokens.email;
    user.gmail.status = "connected";
    await user.save();

    res.redirect(`${FRONTEND_URL}/dashboard/dashboard.html?gmail=connected`);
  } catch (err) {
    console.error("Gmail callback error:", err);
    res.redirect(`${FRONTEND_URL}/dashboard/dashboard.html?gmail=error&msg=OAuth+failed`);
  }
});

// POST /api/gmail/sync — fetch recent emails from Gmail and parse them automatically
router.post("/sync", authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user || !user.gmail || !user.gmail.refreshToken) {
      return res.status(400).json({ error: "Gmail not connected. Please connect your Gmail first." });
    }
    if (!isConfigured()) {
      return res.status(500).json({ error: "AI parser not configured" });
    }

    const emails = await fetchRecentEmails(userId, 30);
    if (emails.length === 0) {
      return res.json({ synced: 0, total: 0, results: [], message: "No recent emails found" });
    }

    let synced = 0;
    let skipped = 0;
    const results = [];

    for (const email of emails) {
      try {
        const parsed = await callAIParser(email.subject, email.from, email.body, userId);
        if (!parsed || !parsed.company || !parsed.role) continue;

        const existing = await findDuplicate(userId, email.subject, email.from);
        if (existing) {
          skipped++;
          continue;
        }

        await createApplicationFromEmail(userId, parsed, email.subject, email.from);
        synced++;
        results.push({ subject: email.subject, company: parsed.company, role: parsed.role });
      } catch {
        continue;
      }
    }

    user.gmail = user.gmail || {};
    user.gmail.lastSyncAt = new Date();
    await user.save();

    res.json({ synced, skipped, total: emails.length, results });
  } catch (err) {
    console.error("Gmail sync error:", err);
    res.status(500).json({ error: "Failed to sync emails" });
  }
});

module.exports = router;
