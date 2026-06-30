const express = require("express");
const Application = require("../models/Application");
const authenticate = require("../middleware/auth");
const { VALID_STATUSES } = require("../helpers/utils");

const router = express.Router();

// GET /api/applications
router.get("/", authenticate, async (req, res) => {
  try {
    const apps = await Application.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    console.error("Get applications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/applications
router.post("/", authenticate, async (req, res) => {
  try {
    const { company, role, location, date, status } = req.body;

    if (!company || !company.trim()) return res.status(400).json({ error: "company is required" });
    if (!role || !role.trim()) return res.status(400).json({ error: "role is required" });
    if (!location || !location.trim()) return res.status(400).json({ error: "location is required" });
    if (!date) return res.status(400).json({ error: "date is required" });

    const finalStatus = status || "Applied";
    if (!VALID_STATUSES.includes(finalStatus)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const newApp = await Application.create({
      company: company.trim(),
      role: role.trim(),
      location: location.trim(),
      date,
      status: finalStatus,
      userId: req.userId,
    });

    res.status(201).json(newApp);
  } catch (err) {
    console.error("Create application error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/applications/:id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
    if (!app) return res.status(404).json({ error: "Application not found" });
    res.json(app);
  } catch (err) {
    console.error("Get application error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/applications/:id
router.put("/:id", authenticate, async (req, res) => {
  try {
    console.log("PUT called with id:", req.params.id, "userId:", req.userId);
    const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
    if (!app) return res.status(404).json({ error: "Application not found" });

    const { company, role, location, date, status } = req.body;

    if (company !== undefined && !company.trim()) return res.status(400).json({ error: "company cannot be empty" });
    if (role !== undefined && !role.trim()) return res.status(400).json({ error: "role cannot be empty" });
    if (location !== undefined && !location.trim()) return res.status(400).json({ error: "location cannot be empty" });
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    if (company !== undefined) app.company = company.trim();
    if (role !== undefined) app.role = role.trim();
    if (location !== undefined) app.location = location.trim();
    if (date !== undefined) app.date = date;
    if (status !== undefined) app.status = status;

    await app.save();
    res.json(app);
  } catch (err) {
    console.error("Update application error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/applications/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    console.log("DELETE called with id:", req.params.id, "userId:", req.userId);
    const result = await Application.deleteOne({ _id: req.params.id, userId: req.userId });
    console.log("Delete result:", result);
    if (result.deletedCount === 0) return res.status(404).json({ error: "Application not found" });
    res.status(204).send();
  } catch (err) {
    console.error("Delete application error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
