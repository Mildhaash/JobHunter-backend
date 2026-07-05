const Session = require("../models/Session");
const User = require("../models/User");

async function authenticate(req, res, next) {
  const authHeader = req.headers["x-session-id"];
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  if (process.env.AI_PARSER_API_KEY && authHeader === process.env.AI_PARSER_API_KEY) {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(400).json({ error: "x-user-id header required for API key auth" });
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.userId = user._id;
    req.user = user;
    return next();
  }

  const sess = await Session.findOne({ sessionId: authHeader });
  if (!sess || sess.expiresAt < new Date()) {
    if (sess) await Session.deleteOne({ sessionId: authHeader });
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await User.findById(sess.userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  req.userId = user._id;
  req.user = user;
  next();
}

module.exports = authenticate;
