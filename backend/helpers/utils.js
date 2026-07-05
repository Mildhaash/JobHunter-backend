const crypto = require("crypto");

const VALID_STATUSES = ["Applied", "Interview", "Offer", "Rejected"];

function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    image: user.image || "",
    gmailConnected: !!(user.gmail && user.gmail.refreshToken),
    gmailEmail: user.gmail ? user.gmail.email : "",
    lastSyncAt: user.gmail ? user.gmail.lastSyncAt : null,
  };
}

module.exports = { VALID_STATUSES, generateSessionId, sanitizeUser };
