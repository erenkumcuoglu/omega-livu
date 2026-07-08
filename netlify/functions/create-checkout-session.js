// Netlify Function — creates a Stripe Checkout Session (card-only, TRY).
const Stripe = require("stripe");
const { PACKAGES } = require("../../packages");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_")) {
    return json(500, { error: "STRIPE_SECRET_KEY ortam değişkenini Netlify’de ayarlayın." });
  }

  try {
    const stripe = Stripe(key);
    const { packageId, livuId } = JSON.parse(event.body || "{}");
    const pkg = PACKAGES[packageId];
    if (!pkg) return json(400, { error: "Geçersiz paket." });
    if (!livuId) return json(400, { error: "LivU ID gerekli." });

    // Build absolute redirect URLs from the incoming request origin.
    const origin =
      event.headers.origin ||
      (event.headers.host ? `https://${event.headers.host}` : process.env.PUBLIC_URL || "");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "try",
            unit_amount: Math.round(pkg.price * 100),
            product_data: {
              name: `LivU ${pkg.amount} Coin`,
              description: `LivU ID: ${livuId}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { packageId, livuId, coins: String(pkg.amount) },
      success_url: `${origin}/index.html?status=success`,
      cancel_url: `${origin}/index.html?status=cancel`,
    });

    return json(200, { url: session.url });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Ödeme oturumu oluşturulamadı." });
  }
};
