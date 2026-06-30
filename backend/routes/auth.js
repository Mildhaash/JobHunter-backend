const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("../models/User");
const Session = require("../models/Session");
const authenticate = require("../middleware/auth");
const { generateSessionId, sanitizeUser } = require("../helpers/utils");

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const BCRYPT_ROUNDS = 10;

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }
    if (!name.trim()) {
      return res.status(400).json({ error: "name cannot be empty" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      provider: "local",
    });

    const sessionId = generateSessionId();
    await Session.create({
      sessionId,
      userId: user._id,
      signedInAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.status(201).json({ sessionId, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const sessionId = generateSessionId();
    await Session.create({
      sessionId,
      userId: user._id,
      signedInAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.json({ sessionId, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"];
    await Session.deleteOne({ sessionId });
    res.status(204).send();
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/session
router.get("/session", async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"];
    if (!sessionId) return res.status(401).json({ error: "No active session" });

    const sess = await Session.findOne({ sessionId });
    if (!sess || sess.expiresAt < new Date()) {
      if (sess) await Session.deleteOne({ sessionId });
      return res.status(401).json({ error: "No active session" });
    }

    const user = await User.findById(sess.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    res.json({ sessionId, user: sanitizeUser(user), signedInAt: sess.signedInAt });
  } catch (err) {
    console.error("Session check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── OAuth Routes ────────────────────────────────────────────────────────────

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/Homepage/login.html`, failureMessage: true }),
  async (req, res) => {
    const sessionId = generateSessionId();
    await Session.create({
      sessionId,
      userId: req.user._id,
      signedInAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.redirect(`${CLIENT_URL}/dashboard/dashboard.html?sessionId=${sessionId}`);
  }
);

// GitHub OAuth
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: `${CLIENT_URL}/Homepage/login.html`, failureMessage: true }),
  async (req, res) => {
    const sessionId = generateSessionId();
    await Session.create({
      sessionId,
      userId: req.user._id,
      signedInAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.redirect(`${CLIENT_URL}/dashboard/dashboard.html?sessionId=${sessionId}`);
  }
);

module.exports = router;
