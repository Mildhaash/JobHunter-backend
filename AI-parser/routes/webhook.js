const express = require("express");
const crypto = require("crypto");
const { parseEmail } = require("../services/aiParser");
const { parseMailgunEmail } = require("../services/emailParser");

const router = express.Router();

router.post("/email", async (req, res) => {
  try {
    const { recipient, sender, subject, "body-plain": bodyPlain, "body-html": bodyHtml } = req.body;

    const lookupRes = await fetch(`${process.env.BACKEND_URL || "http://localhost:3000"}/api/forwarding/lookup?address=${encodeURIComponent(recipient)}`);
    if (!lookupRes.ok) {
      return res.status(404).json({ error: "Unknown forwarding address" });
    }
    const { userId } = await lookupRes.json();

    const body = bodyPlain || bodyHtml || "";
    const parsed = await parseEmail(subject || "", body);

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    const createRes = await fetch(`${backendUrl}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": process.env.BACKEND_API_KEY,
        "X-User-Id": userId,
      },
      body: JSON.stringify({
        company: parsed.company,
        role: parsed.role,
        status: parsed.status,
        location: parsed.location,
        date: new Date().toISOString().split("T")[0],
        source: "email",
        emailSubject: subject || "",
        emailFrom: sender || "",
        jobUrl: parsed.jobUrl || "",
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      return res.status(500).json({ error: err.error || "Failed to create application" });
    }

    const application = await createRes.json();
    res.json({ success: true, application, aiConfidence: parsed.confidence });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
