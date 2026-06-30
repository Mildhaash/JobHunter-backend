const mongoose = require("mongoose");
const dns = require("dns");

// Use Google DNS to resolve MongoDB SRV records
// (your local DNS server doesn't support SRV records)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

function connectDB() {
  return mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => {
      console.error("MongoDB connection error:", err.message);
      process.exit(1);
    });
}

module.exports = connectDB;
