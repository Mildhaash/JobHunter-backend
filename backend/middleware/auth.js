const Session = require("../models/Session");
const User = require("../models/User");

async function authenticate(req, res, next) {
  const sessionId = req.headers["x-session-id"];
  if (!sessionId) return res.status(401).json({ error: "Unauthorized" });

  const sess = await Session.findOne({ sessionId });
  if (!sess || sess.expiresAt < new Date()) {
    if (sess) await Session.deleteOne({ sessionId });
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await User.findById(sess.userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  req.userId = user._id;
  req.user = user;
  next();
}

module.exports = authenticate;
