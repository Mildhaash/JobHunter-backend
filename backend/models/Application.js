const mongoose = require("mongoose");

const VALID_STATUSES = ["Applied", "Interview", "Offer", "Rejected"];

const applicationSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: "Applied",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1 });

module.exports = mongoose.model("Application", applicationSchema);
