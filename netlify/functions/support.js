// Netlify Function — receives customer-service form submissions.
const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
  try {
    const data = JSON.parse(event.body || "{}");
    const { firstName, lastName, email, phone, issue } = data;
    if (!firstName || !lastName || !email || !phone || !issue) {
      return json(400, { error: "Zorunlu alanlar eksik." });
    }
    // TODO: forward to your ticketing system / email (customer.service@livuchat.com),
    // e.g. via SendGrid, Resend, or a Netlify + email integration.
    console.log("📨 New support request:", data);
    return json(200, { ok: true });
  } catch (err) {
    return json(400, { error: "Geçersiz istek." });
  }
};
