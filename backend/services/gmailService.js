const { google } = require("googleapis");
const User = require("../models/User");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const REDIRECT_URI = process.env.GOOGLE_GMAIL_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:3000"}/api/gmail/callback`;

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

function getAuthUrl(state) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });
}

async function handleCallback(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    email: profile.data.emailAddress,
  };
}

function decodeBase64Url(data) {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf-8");
}

function extractPlainText(payload) {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.mimeType === "text/html" && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const found = extractPlainText(part);
      if (found) return found;
    }
  }

  return "";
}

function extractHtmlBody(payload) {
  if (!payload) return "";

  if (payload.mimeType === "text/html" && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const found = extractHtmlBody(part);
      if (found) return found;
    }
  }

  return "";
}

function getHeader(headers, name) {
  if (!headers) return "";
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : "";
}

async function fetchRecentEmails(userId, maxResults = 20) {
  const user = await User.findById(userId);
  if (!user || !user.gmail || !user.gmail.refreshToken) {
    throw new Error("Gmail not connected");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.gmail.accessToken,
    refresh_token: user.gmail.refreshToken,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      user.gmail.accessToken = tokens.access_token;
      await user.save();
    }
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "newer_than:30d",
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  const results = [];
  for (const msg of messages) {
    try {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = full.data.payload.headers;
      const subject = getHeader(headers, "Subject");
      const from = getHeader(headers, "From");
      const date = getHeader(headers, "Date");
      const plainText = extractPlainText(full.data.payload);
      const htmlBody = extractHtmlBody(full.data.payload);

      results.push({
        id: msg.id,
        threadId: msg.threadId,
        subject,
        from,
        date,
        body: plainText || htmlBody,
        snippet: full.data.snippet || "",
      });
    } catch (err) {
      continue;
    }
  }

  return results;
}

module.exports = { getAuthUrl, handleCallback, fetchRecentEmails, SCOPES };
