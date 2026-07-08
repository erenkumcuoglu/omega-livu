/**
 * LivU top-up — local dev Stripe backend (card-only, TRY).
 *
 * This Express server is for LOCAL development. On Netlify the same endpoints
 * are served by the serverless functions in netlify/functions/ (see netlify.toml).
 *
 * Serves the static front-end (public/) and exposes:
 *   POST /api/create-checkout-session  -> creates a Stripe Checkout Session (card, TRY)
 *   POST /api/support                  -> receives customer-service form submissions
 *   POST /api/webhook                  -> Stripe webhook (payment fulfillment)
 *
 * Setup:
 *   1) npm install
 *   2) cp .env.example .env  and fill in STRIPE_SECRET_KEY
 *   3) npm start
 */

require("dotenv").config();
const express = require("express");
const path = require("path");
const Stripe = require("stripe");
const { PACKAGES } = require("./packages");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || "");
const app = express();
const PORT = process.env.PORT || 4242;
const DOMAIN = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const PUBLIC_DIR = path.join(__dirname, "public");

// Stripe webhook needs the raw body — register it BEFORE express.json().
app.post("/api/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { livuId, packageId } = session.metadata || {};
    // TODO: credit `PACKAGES[packageId].amount` coins to the account `livuId`.
    console.log(`✅ Payment complete: ${packageId} for LivU ID ${livuId}`);
  }
  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Publishable key for the client (safe to expose). Empty unless a real pk_ is set.
app.get("/api/config", (req, res) => {
  const pk = process.env.STRIPE_PUBLISHABLE_KEY || "";
  res.json({ publishableKey: pk.startsWith("pk_") ? pk : "" });
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || !key.startsWith("sk_")) {
      return res.status(500).json({ error: ".env içine geçerli STRIPE_SECRET_KEY (sk_test_...) ekleyin." });
    }
    const { packageId, livuId, consent, consentAt } = req.body;
    const pkg = PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: "Geçersiz paket." });
    if (!livuId) return res.status(400).json({ error: "LivU ID gerekli." });
    if (consent !== true) return res.status(400).json({ error: "İade koşulları kabul edilmedi." });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded", // renders inside our page
      payment_method_types: ["card"], // card-only
      line_items: [
        {
          price_data: {
            currency: "try",
            unit_amount: Math.round(pkg.price * 100), // kuruş
            product_data: {
              name: `LivU ${pkg.amount} Coin`,
              description: `LivU ID: ${livuId}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        packageId,
        livuId,
        coins: String(pkg.amount),
        consent: "accepted",
        consent_at: consentAt || new Date().toISOString(),
      },
      return_url: `${DOMAIN}/return.html?session_id={CHECKOUT_SESSION_ID}`,
    });

    res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ödeme oturumu oluşturulamadı." });
  }
});

// Return page queries this to show the payment result.
app.get("/api/session-status", async (req, res) => {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || !key.startsWith("sk_")) {
      return res.status(500).json({ error: "STRIPE_SECRET_KEY ayarlı değil." });
    }
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    res.json({
      status: session.status,
      payment_status: session.payment_status,
      coins: session.metadata?.coins || null,
      livuId: session.metadata?.livuId || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Oturum durumu alınamadı." });
  }
});

app.post("/api/support", async (req, res) => {
  const { firstName, lastName, email, phone, issue } = req.body || {};
  if (!firstName || !lastName || !email || !phone || !issue) {
    return res.status(400).json({ error: "Zorunlu alanlar eksik." });
  }
  // TODO: forward to your ticketing system / email (e.g. customer.service@livuchat.com).
  console.log("📨 New support request:", req.body);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`LivU running at ${DOMAIN}`));
