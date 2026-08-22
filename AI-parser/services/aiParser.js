const PARSE_PROMPT = `You are an AI that extracts job application details from email content.

Given the email subject and body, extract the following fields:
- company: The company name (string)
- role: The job role/title (string)
- status: One of "Applied", "Interview", "Offer", "Rejected" (choose the best match)
- location: Job location if mentioned, otherwise "Remote" (string)
- jobUrl: The job posting URL if found, otherwise null (string or null)
- confidence: Your confidence score from 0 to 1 (number)

Return ONLY a valid JSON object with these fields, no markdown or extra text.

Examples of status detection:
- "Thank you for applying" / "Application received" → "Applied"
- "Interview invitation" / "Phone screen" / "Technical interview" → "Interview"
- "Offer letter" / "Congratulations" / "We are pleased to offer" → "Offer"
- "Unfortunately" / "Not selected" / "We regret to inform" → "Rejected"

If you cannot determine a field, use reasonable defaults:
- company: "Unknown Company"
- role: "Unknown Role"
- status: "Applied"
- location: "Remote"`;

async function parseEmail(subject, textBody, from) {
  const apiKey = process.env.GROQ_API_KEY;
  const input = `Email Subject: ${subject}\nFrom: ${from || "Unknown"}\n\nEmail Body:\n${textBody}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
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

  return {
    company: parsed.company || "Unknown Company",
    role: parsed.role || "Unknown Role",
    status: ["Applied", "Interview", "Offer", "Rejected"].includes(parsed.status)
      ? parsed.status
      : "Applied",
    location: parsed.location || "Remote",
    jobUrl: parsed.jobUrl || null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
  };
}

module.exports = { parseEmail };
