const Application = require("../models/Application");
const { parseEmail } = require("./aiParser");

async function callAIParser(subject, from, body, userId) {
  return await parseEmail(subject || "", body || "", from || "");
}

async function findDuplicate(userId, company, role) {
  return Application.findOne({
    userId,
    company: company || "",
    role: role || "",
  });
}

async function createApplicationFromEmail(userId, parsed, subject, from) {
  const existing = await findDuplicate(userId, parsed.company, parsed.role);
  if (existing) {
    if (parsed.status) existing.status = parsed.status;
    if (parsed.location) existing.location = parsed.location;
    if (parsed.jobUrl) existing.jobUrl = parsed.jobUrl;
    if (subject) existing.emailSubject = subject;
    if (from) existing.emailFrom = from;
    await existing.save();
    return existing;
  }
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
