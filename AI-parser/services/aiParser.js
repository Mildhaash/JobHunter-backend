const PARSE_PROMPT = `You are an AI that determines if an email is a genuine job application update and extracts details.

FIRST, determine if this email is related to a real job application the user submitted. It MUST be one of:
- Application confirmation (you applied to X)
- Interview invitation or scheduling
- Offer letter / job offer
- Rejection / not selected notification
- Status update on an application you made

REJECT (return {"isJobApplication": false}) these types of emails:
- Newsletters, marketing, promotions, or spam
- Recruiter cold outreach or unsolicited job suggestions
- Generic company updates or blog posts
- Subscription confirmations
- Social media notifications
- Email digests or weekly roundups
- Anything where the user did NOT actually apply for a job

If it IS a genuine job application email, return:
{
  "isJobApplication": true,
  "company": "Company name as mentioned in the email (no extra words appended)",
  "role": "Job title/role applied for",
  "status": "Applied" | "Interview" | "Offer" | "Rejected",
  "location": "Location if mentioned, otherwise Remote",
  "jobUrl": "URL if found, otherwise null",
  "confidence": 0.0 to 1.0
}

Status detection:
- "Thank you for applying" / "Application received" / "We received your application" → "Applied"
- "Interview invitation" / "Phone screen" / "Technical interview" / "Schedule a call" → "Interview"
- "Offer letter" / "Congratulations" / "We are pleased to offer" / "Welcome to the team" → "Offer"
- "Unfortunately" / "Not selected" / "We regret to inform" / "position has been filled" → "Rejected"

IMPORTANT:
- The company name should be EXACTLY as the email states, nothing extra appended
- Return ONLY a valid JSON object, no markdown or extra text`;

async function parseEmail(subject, textBody, from) {
  const apiKey = process.env.GROQ_API_KEY;
  const input = `Email Subject: ${subject}\nFrom: ${from || "Unknown"}\n\nEmail Body:\n${textBody.substring(0, 2000)}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: PARSE_PROMPT },
        { role: "user", content: input },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq API error: ${res.status} - ${err.error?.message || "unknown"}`);
  }

  const data = await res.json();
  const rawText = data.choices[0].message.content.trim();

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (parsed.isJobApplication === false) {
    return null;
  }

  if (!parsed.company || !parsed.role) {
    return null;
  }

  return {
    company: parsed.company,
    role: parsed.role,
    status: ["Applied", "Interview", "Offer", "Rejected"].includes(parsed.status)
      ? parsed.status
      : "Applied",
    location: parsed.location || "Remote",
    jobUrl: parsed.jobUrl || null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
  };
}

module.exports = { parseEmail };
