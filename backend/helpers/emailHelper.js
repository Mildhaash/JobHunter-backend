const Application = require("../models/Application");
const { parseEmail } = require("./aiParser");

async function callAIParser(subject, from, body, userId) {
  return await parseEmail(subject || "", body || "", from || "");
}

async function findDuplicate(userId, subject, from) {
  return Application.findOne({
    userId,
    source: "email",
    emailSubject: subject || "",
    emailFrom: from || "",
  });
}

async function createApplicationFromEmail(userId, parsed, subject, from) {
  return Application.create({
    userId,
    company: parsed.company,
    role: parsed.role,
    status: parsed.status || "Applied",
    location: parsed.location || "",
    date: new Date().toISOString().split("T")[0],
    source: "email",
    emailSubject: subject || "",
    emailFrom: from || "",
    jobUrl: parsed.jobUrl || "",
  });
}

function isConfigured() {
  return !!process.env.GROQ_API_KEY;
}

module.exports = { callAIParser, findDuplicate, createApplicationFromEmail, isConfigured };
