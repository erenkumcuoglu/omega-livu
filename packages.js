// Single source of truth for coin packages (server-side).
// amount = coin count, price = TRY. Prices mirror livuchat.com exactly.
// Stripe expects the smallest currency unit (kuruş) => price * 100.
const PACKAGES = {
  p299:   { amount: 299,   price: 9 },
  p990:   { amount: 990,   price: 35 },
  p300:   { amount: 300,   price: 99 },
  p650:   { amount: 650,   price: 209 },
  p1250:  { amount: 1250,  price: 379 },
  p1800:  { amount: 1800,  price: 499 },
  p3500:  { amount: 3500,  price: 929 },
  p7000:  { amount: 7000,  price: 1759 },
  p15000: { amount: 15000, price: 3699 },
  p35000: { amount: 35000, price: 8449 },
};

module.exports = { PACKAGES };
