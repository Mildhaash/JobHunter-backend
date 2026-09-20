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

const STATUS_RANK = { Applied: 0, Interview: 1, Offer: 2, Rejected: 3 };

async function cleanupDuplicates() {
  const applications = await Application.find({}).sort({ createdAt: 1 });
  const groups = {};
  for (const app of applications) {
    const key = `${app.userId}_${app.company.trim().toLowerCase()}_${app.role.trim().toLowerCase()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(app);
  }

  let merged = 0;
  for (const group of Object.values(groups)) {
    if (group.length <= 1) continue;
    const keep = group.reduce((best, curr) => {
      const bestRank = STATUS_RANK[best.status] ?? 0;
      const currRank = STATUS_RANK[curr.status] ?? 0;
      if (currRank > bestRank) return curr;
      if (currRank === bestRank && curr.createdAt > best.createdAt) return curr;
      return best;
    });
    const toDelete = group.filter((a) => a._id.toString() !== keep._id.toString());
    if (keep.source !== "email") {
      const emailVersion = group.find((a) => a.source === "email");
      if (emailVersion) {
        keep.source = "email";
        keep.emailSubject = emailVersion.emailSubject;
        keep.emailFrom = emailVersion.emailFrom;
        if (emailVersion.jobUrl) keep.jobUrl = emailVersion.jobUrl;
        await keep.save();
      }
    }
    await Application.deleteMany({ _id: { $in: toDelete.map((a) => a._id) } });
    merged += toDelete.length;
  }
  if (merged > 0) console.log(`Dedup cleanup: merged ${merged} duplicate application(s)`);
}

module.exports = { callAIParser, findDuplicate, createApplicationFromEmail, isConfigured, cleanupDuplicates };
