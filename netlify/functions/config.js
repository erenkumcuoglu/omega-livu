// Netlify Function — returns the Stripe publishable key for the client.
// The publishable key (pk_...) is safe to expose to the browser.
exports.handler = async () => {
  const pk = process.env.STRIPE_PUBLISHABLE_KEY || "";
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publishableKey: pk.startsWith("pk_") ? pk : "" }),
  };
};
