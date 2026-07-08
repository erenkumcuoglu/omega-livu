// Netlify Function — returns a Checkout Session's status for the return page.
const Stripe = require("stripe");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_")) {
    return json(500, { error: "STRIPE_SECRET_KEY ayarlı değil." });
  }
  const sessionId = (event.queryStringParameters || {}).session_id;
  if (!sessionId) return json(400, { error: "session_id gerekli." });

  try {
    const stripe = Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return json(200, {
      status: session.status,
      payment_status: session.payment_status,
      coins: session.metadata?.coins || null,
      livuId: session.metadata?.livuId || null,
    });
  } catch (err) {
    return json(500, { error: "Oturum durumu alınamadı." });
  }
};
