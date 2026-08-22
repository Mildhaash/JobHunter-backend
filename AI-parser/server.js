require("dotenv").config();
const express = require("express");
const webhookRoutes = require("./routes/webhook");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "JobHunter AI Parser is running", version: "1.1.0" });
});

app.use("/webhook", webhookRoutes);

app.post("/parse-email", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== process.env.BACKEND_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { subject, from, body } = req.body;
    if (!subject && !body) {
      return res.status(400).json({ error: "subject or body required" });
    }

    const { parseEmail } = require("./services/aiParser");
    const parsed = await parseEmail(subject || "", body || "", from || "");

    res.json({
      company: parsed.company,
      role: parsed.role,
      status: parsed.status,
      location: parsed.location,
      jobUrl: parsed.jobUrl,
      confidence: parsed.confidence,
    });
  } catch (err) {
    console.error("Parse email error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`AI Parser running on http://localhost:${PORT}`);
});
