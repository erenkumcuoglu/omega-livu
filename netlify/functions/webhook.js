// Netlify Function — Stripe webhook (optional; needed for reliable coin fulfillment).
// Endpoint URL to register in Stripe: https://<your-site>/api/webhook
// Requires STRIPE_WEBHOOK_SECRET (whsec_...) in Netlify environment variables.
const Stripe = require("stripe");
const { PACKAGES } = require("../../packages");

exports.handler = async (event) => {
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !key.startsWith("sk_") || !whSecret || !whSecret.startsWith("whsec_")) {
    return { statusCode: 500, body: "Webhook not configured." };
  }

  const stripe = Stripe(key);
  const sig = event.headers["stripe-signature"];
  // Stripe signature verification needs the exact raw body.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const { livuId, packageId } = session.metadata || {};
    const pkg = PACKAGES[packageId];
    // TODO: credit `pkg.amount` coins to account `livuId` via your backend/API.
    console.log(`✅ Payment complete: ${packageId} (${pkg?.amount} coin) for LivU ID ${livuId}`);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
