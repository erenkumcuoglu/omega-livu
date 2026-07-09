// Netlify Function — receives customer-service form submissions and emails them
// to Omega support (eren@omegadijital.com).
//
// Email delivery uses Resend (https://resend.com) via a simple HTTPS call — no
// npm dependency. Set these environment variables in Netlify to enable it:
//   RESEND_API_KEY  = re_...            (required to actually send)
//   SUPPORT_EMAIL   = eren@omegadijital.com   (optional; this is the default)
//   SUPPORT_FROM    = "Omega Destek <destek@omegadijital.com>"
//                     (optional; must be a Resend-verified domain. Until you
//                      verify omegadijital.com, use "onboarding@resend.dev")
// Without RESEND_API_KEY the submission is logged (visible in Netlify function
// logs) and still returns success to the user.

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const esc = (s = "") =>
  String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Geçersiz istek." });
  }

  const { firstName, lastName, email, phone, accountInfo, transactionId, issue } = data;
  if (!firstName || !lastName || !email || !phone || !issue) {
    return json(400, { error: "Zorunlu alanlar eksik." });
  }

  const to = process.env.SUPPORT_EMAIL || "eren@omegadijital.com";
  const from = process.env.SUPPORT_FROM || "Omega Destek <onboarding@resend.dev>";
  const apiKey = process.env.RESEND_API_KEY;

  const rows = [
    ["İsim Soyisim", `${firstName} ${lastName}`],
    ["E-posta", email],
    ["Telefon", phone],
    ["Hesap Bilgisi (LivU ID)", accountInfo || "—"],
    ["İşlem ID", transactionId || "—"],
    ["Sorun", issue],
  ];
  const html =
    `<h2>Yeni müşteri hizmetleri talebi</h2><table cellpadding="6" style="border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td style="font-weight:700">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("") +
    `</table>`;

  if (!apiKey) {
    console.log(`📨 Support request (RESEND_API_KEY yok, e-posta gönderilmedi) → ${to}:`, data);
    return json(200, { ok: true }); // still confirm to the user
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `LivU Destek — ${firstName} ${lastName}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
      // Don't fail the user; log for follow-up.
    }
    return json(200, { ok: true });
  } catch (err) {
    console.error("Support email error:", err);
    return json(200, { ok: true });
  }
};
