const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, select: false },
    image: { type: String, default: "" },
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    forwardingAddress: { type: String, default: "" },
    gmail: {
      accessToken: { type: String, default: "" },
      refreshToken: { type: String, default: "" },
      email: { type: String, default: "" },
      historyId: { type: String, default: "" },
      lastSyncAt: { type: Date },
      verificationUrl: { type: String, default: "" },
      status: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
