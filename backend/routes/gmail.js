const express = require("express");
const authenticate = require("../middleware/auth");
const User = require("../models/User");
const Application = require("../models/Application");

const router = express.Router();
const AI_PARSER_URL = process.env.AI_PARSER_URL;
const AI_PARSER_API_KEY = process.env.AI_PARSER_API_KEY;

// GET /api/gmail/status
router.get("/status", authenticate, (req, res) => {
  const user = req.user;
  const gmail = user.gmail || {};
  res.json({
    connected: !!(gmail.lastSyncAt),
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

    if (!AI_PARSER_URL || !AI_PARSER_API_KEY) {
      return res.status(500).json({ error: "AI parser not configured" });
    }

    const aiRes = await fetch(`${AI_PARSER_URL}/parse-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": AI_PARSER_API_KEY,
        "X-User-Id": req.userId.toString(),
      },
      body: JSON.stringify({ subject: subject || "", from: from || "", body: body || "" }),
    });

    if (!aiRes.ok) {
      return res.status(500).json({ error: "AI parser failed" });
    }

    const parsed = await aiRes.json();

    if (!parsed.company || !parsed.role) {
      return res.json({ found: false, message: "This doesn't look like a job-related email" });
    }

    const existing = await Application.findOne({
      userId: req.userId,
      source: "email",
      emailSubject: subject || "",
      emailFrom: from || "",
    });
    if (existing) {
      return res.json({ found: false, message: "This email was already added", application: existing });
    }

    const application = await Application.create({
      userId: req.userId,
      company: parsed.company,
      role: parsed.role,
      status: parsed.status || "Applied",
      location: parsed.location || "",
      date: new Date().toISOString().split("T")[0],
      source: "email",
      emailSubject: subject || "",
      emailFrom: from || "",
      jobUrl: parsed.jobUrl || "",
    });

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

    if (!AI_PARSER_URL || !AI_PARSER_API_KEY) {
      return res.status(500).json({ error: "AI parser not configured" });
    }

    let synced = 0;
    const results = [];

    for (const email of emails) {
      try {
        const aiRes = await fetch(`${AI_PARSER_URL}/parse-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": AI_PARSER_API_KEY,
            "X-User-Id": req.userId.toString(),
          },
          body: JSON.stringify({
            subject: email.subject || "",
            from: email.from || "",
            body: email.body || "",
          }),
        });

        if (!aiRes.ok) continue;
        const parsed = await aiRes.json();
        if (!parsed.company || !parsed.role) continue;

        const existing = await Application.findOne({
          userId: req.userId,
          source: "email",
          emailSubject: email.subject || "",
          emailFrom: email.from || "",
        });
        if (existing) continue;

        await Application.create({
          userId: req.userId,
          company: parsed.company,
          role: parsed.role,
          status: parsed.status || "Applied",
          location: parsed.location || "",
          date: new Date().toISOString().split("T")[0],
          source: "email",
          emailSubject: email.subject || "",
          emailFrom: email.from || "",
          jobUrl: parsed.jobUrl || "",
        });
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

module.exports = router;
