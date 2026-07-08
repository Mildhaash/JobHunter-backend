const Application = require("../models/Application");

const AI_PARSER_URL = process.env.AI_PARSER_URL;
const AI_PARSER_API_KEY = process.env.AI_PARSER_API_KEY;

async function callAIParser(subject, from, body, userId) {
  const aiRes = await fetch(`${AI_PARSER_URL}/parse-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": AI_PARSER_API_KEY,
      "X-User-Id": userId.toString(),
    },
    body: JSON.stringify({ subject: subject || "", from: from || "", body: body || "" }),
  });

  if (!aiRes.ok) return null;
  return await aiRes.json();
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
  return !!(AI_PARSER_URL && AI_PARSER_API_KEY);
}

module.exports = { callAIParser, findDuplicate, createApplicationFromEmail, isConfigured };
