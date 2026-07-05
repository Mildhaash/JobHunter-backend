function parseMailgunEmail(body) {
  return {
    recipient: body.recipient || "",
    sender: body.sender || "",
    subject: body.subject || "",
    bodyPlain: body["body-plain"] || "",
    bodyHtml: body["body-html"] || "",
    timestamp: body.timestamp || "",
    token: body.token || "",
    signature: body.signature || "",
  };
}

module.exports = { parseMailgunEmail };
