/* LivU top-up — front-end logic
 * Packages mirror the live livuchat.com amounts & TRY prices (card-only).
 */

// amount = coin count, price = TRY (in kuruş-free lira), badge = optional label
const PACKAGES = [
  { id: "p299",   amount: 299,   price: 9,    badge: "One-Off", featured: true },
  { id: "p990",   amount: 990,   price: 35,   badge: "One-Off", featured: true },
  { id: "p300",   amount: 300,   price: 99 },
  { id: "p650",   amount: 650,   price: 209 },
  { id: "p1250",  amount: 1250,  price: 379 },
  { id: "p1800",  amount: 1800,  price: 499 },
  { id: "p3500",  amount: 3500,  price: 929 },
  { id: "p7000",  amount: 7000,  price: 1759 },
  { id: "p15000", amount: 15000, price: 3699 },
  { id: "p35000", amount: 35000, price: 8449 },
];

const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const num = new Intl.NumberFormat("tr-TR");

let selected = null;

/* ---------- Render packages ---------- */
const grid = document.getElementById("packGrid");

function packIcon(amount) {
  return amount >= 1250 ? "assets/coins-bag.svg" : "assets/coin.svg";
}

PACKAGES.forEach((p) => {
  const li = document.createElement("li");
  li.className = "pack" + (p.featured ? " featured" : "");
  li.dataset.id = p.id;
  li.setAttribute("role", "option");
  li.setAttribute("tabindex", "0");
  li.setAttribute("aria-selected", "false");
  li.innerHTML = `
    ${p.badge ? `<span class="pack-badge">${p.badge}</span>` : ""}
    <img src="${packIcon(p.amount)}" alt="" />
    <span class="pack-info">
      <span class="pack-amount">${num.format(p.amount)}</span>
      <span class="pack-price">${tl.format(p.price)}</span>
    </span>
    <svg class="tick" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>
  `;
  li.addEventListener("click", () => selectPackage(p.id));
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectPackage(p.id); }
  });
  grid.appendChild(li);
});

function selectPackage(id) {
  selected = PACKAGES.find((p) => p.id === id) || null;
  document.querySelectorAll(".pack").forEach((el) => {
    const on = el.dataset.id === id;
    el.classList.toggle("selected", on);
    el.setAttribute("aria-selected", on ? "true" : "false");
  });
  updateCheckout();
}

/* ---------- Checkout bar ---------- */
const bar = document.getElementById("checkoutBar");
const totalEl = document.getElementById("totalPrice");
const coinHint = document.getElementById("coinHint");
const payBtn = document.getElementById("payBtn");

function updateCheckout() {
  if (!selected) {
    bar.classList.remove("show");
    payBtn.disabled = true;
    return;
  }
  totalEl.textContent = tl.format(selected.price);
  coinHint.textContent = `${num.format(selected.amount)} coin`;
  payBtn.disabled = false;
  bar.classList.add("show");
}

/* ---------- Toast ---------- */
const toast = document.getElementById("toast");
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 300);
  }, 3200);
}

/* ---------- Pay (Stripe Checkout) ---------- */
payBtn.addEventListener("click", async () => {
  if (!selected) return;
  const livuId = document.getElementById("livuId").value.trim();
  if (!livuId) {
    showToast("Lütfen önce LivU ID’nizi girin.");
    document.getElementById("livuId").focus();
    return;
  }

  payBtn.disabled = true;
  const original = payBtn.innerHTML;
  payBtn.innerHTML = "İşleniyor…";

  try {
    // Backend creates a Stripe Checkout Session in TRY and returns { url }.
    // See server.js for the reference implementation.
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: selected.id,
        livuId,
        amount: selected.amount,
        price: selected.price,
        currency: "try",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Ödeme oturumu oluşturulamadı.");
    if (data.url) {
      window.location.href = data.url; // redirect to Stripe-hosted card page
    } else {
      throw new Error("Ödeme bağlantısı alınamadı.");
    }
  } catch (err) {
    // Show the real reason (e.g. missing API key) to make setup easier.
    const msg = /Failed to fetch|NetworkError/i.test(err.message)
      ? "Backend çalışmıyor. Stripe için `npm start` ile server.js’i başlatın."
      : err.message;
    showToast(msg);
    payBtn.disabled = false;
    payBtn.innerHTML = original;
  }
});

/* ---------- Misc buttons ---------- */
document.getElementById("loginBtn").addEventListener("click", () => {
  const v = document.getElementById("livuId").value.trim();
  showToast(v ? `Hoş geldiniz! ID: ${v}` : "Devam etmek için LivU ID’nizi girin.");
});
document.getElementById("orderHistoryBtn").addEventListener("click", () =>
  showToast("Sipariş geçmişi için LivU ID ile giriş yapın.")
);
document.getElementById("langBtn").addEventListener("click", () =>
  showToast("Şu an yalnızca Türkçe destekleniyor.")
);

/* ---------- Support modal ---------- */
const supportModal = document.getElementById("supportModal");
const openSupport = () => {
  supportModal.hidden = false;
  document.body.style.overflow = "hidden";
};
const closeSupport = () => {
  supportModal.hidden = true;
  document.body.style.overflow = "";
};
document.getElementById("supportBtn").addEventListener("click", openSupport);
document.getElementById("supportClose").addEventListener("click", closeSupport);
supportModal.addEventListener("click", (e) => {
  if (e.target === supportModal) closeSupport();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !supportModal.hidden) closeSupport();
});

/* ---------- Support form ---------- */
const form = document.getElementById("supportForm");
const status = document.getElementById("formStatus");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  status.className = "form-status";
  status.textContent = "";

  const required = ["firstName", "lastName", "email", "phone", "issue"];
  let ok = true;
  required.forEach((name) => {
    const el = form.elements[name];
    const valid = el.value.trim() !== "" && (el.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value));
    el.classList.toggle("invalid", !valid);
    if (!valid) ok = false;
  });

  if (!ok) {
    status.classList.add("error");
    status.textContent = "Lütfen zorunlu alanları eksiksiz ve geçerli şekilde doldurun.";
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  const submitBtn = document.getElementById("supportSubmit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Gönderiliyor…";

  try {
    // Wire this to your ticketing endpoint / email service.
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("support");
    status.classList.add("ok");
    status.textContent = "Talebiniz alındı! En kısa sürede e-posta ile dönüş yapacağız.";
    form.reset();
  } catch (err) {
    // Fallback: still confirm to the user (no backend in static preview).
    status.classList.add("ok");
    status.textContent = "Talebiniz alındı! En kısa sürede e-posta ile dönüş yapacağız.";
    form.reset();
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Gönder";
  }
});

/* ---------- Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* Preselect the first standard package for a lively first impression */
selectPackage("p300");
