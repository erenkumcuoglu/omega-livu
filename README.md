# LivU · Coin Yükleme (Card-only / Stripe TRY)

livuchat.com yükleme sayfasının modern, mobil öncelikli ve **yalnızca kredi/banka kartı** ile çalışan yeniden tasarımı. Ödemeler **Stripe** üzerinden **Türk Lirası (TRY)** olarak tahsil edilir. Banka transferi, kripto, BKM Express, Troy vb. tüm diğer yöntemler kaldırılmıştır.

## İçerik

| Yol | Açıklama |
|-----|----------|
| `public/index.html` | Ana yükleme sayfası (paket seçimi + kart ile ödeme) |
| `public/styles.css` | Tüm sayfaların modern tasarım sistemi |
| `public/app.js` | Paket seçimi, checkout ve müşteri hizmetleri formu mantığı |
| `public/terms.html` | Derlenmiş & sadeleştirilmiş **Hizmet Koşulları** (TR) |
| `public/privacy.html` | Derlenmiş & sadeleştirilmiş **Gizlilik Politikası** (TR) |
| `public/return.html` | Ödeme sonrası dönüş/sonuç sayfası |
| `public/assets/` | LivU logosu, Visa/Mastercard ve coin görselleri |
| `packages.js` | Paket & fiyatların tek doğruluk kaynağı (sunucu tarafı) |
| `netlify/functions/` | Serverless API (Netlify prod): config, create-checkout-session, session-status, webhook |
| `server.js` | **Lokal geliştirme** için Express backend (aynı uçlar) |
| `netlify.toml` | Netlify publish/functions/redirect yapılandırması |

## Denominasyonlar (miktar & fiyat — orijinalle birebir)

| Coin | Fiyat (TRY) | Not |
|-----:|------------:|-----|
| 299 | ₺9 | One-Off |
| 990 | ₺35 | One-Off |
| 300 | ₺99 | |
| 650 | ₺209 | |
| 1.250 | ₺379 | |
| 1.800 | ₺499 | |
| 3.500 | ₺929 | |
| 7.000 | ₺1.759 | |
| 15.000 | ₺3.699 | |
| 35.000 | ₺8.449 | |

Fiyatlar hem `app.js` (görüntüleme) hem de `server.js` (sunucu tarafı doğrulama) içinde tanımlıdır. **Sunucu, istemciden gelen fiyata asla güvenmez.**

## Çalıştırma

Yalnızca arayüz (statik) önizleme:

```bash
npx serve .        # veya herhangi bir statik sunucu
```

Stripe ile tam akış:

```bash
npm install
cp .env.example .env      # STRIPE_SECRET_KEY değerini girin
npm start                 # http://localhost:4242  (site + ödeme aynı port)
```

### Stripe sandbox (test) anahtarlarını alma
1. https://dashboard.stripe.com açın ve sağ üstten **Test mode**’u açık tutun.
2. **Developers → API keys** altında **iki anahtarı** kopyalayın:
   - **Secret key** (`sk_test_...`) → `.env` içinde `STRIPE_SECRET_KEY`
   - **Publishable key** (`pk_test_...`) → `.env` içinde `STRIPE_PUBLISHABLE_KEY`
3. `.env`’i kaydedip sunucuyu yeniden başlatın (`npm start`). Ödeme formu **sayfanın içinde** (Embedded Checkout) açılır.

### Test kartları (yalnızca test modunda)
| Senaryo | Kart no | Son kul. / CVC |
|---------|---------|----------------|
| Başarılı ödeme | `4242 4242 4242 4242` | gelecekteki herhangi bir tarih / herhangi 3 hane |
| 3D Secure gerekli | `4000 0027 6000 3184` | aynı |
| Kart reddedildi | `4000 0000 0000 0002` | aynı |

> **Not:** Embedded Checkout kendi iframe’ini kullanır; başka bir iframe içine yerleştirilemez. Test ederken siteyi **normal bir tarayıcı sekmesinde** (`http://localhost:4242`) açın, gömülü önizleme panelinde değil.

## Netlify’de deploy

Bu repo Netlify için hazırdır: statik site `public/`’ten yayınlanır, `/api/*` çağrıları `netlify/functions/`’a yönlenir (bkz. `netlify.toml`). **Express `server.js` yalnızca lokal geliştirme içindir; Netlify onu çalıştırmaz.**

1. **Repoyu bağlayın:** Netlify → **Add new site → Import an existing project** → GitHub → `omega-livu`.
2. **Build ayarları** (genelde `netlify.toml`’dan otomatik gelir):
   - Build command: *(boş bırakılabilir)*
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
3. **Ortam değişkenleri** (Site settings → Environment variables): anahtarları burada tanımlayın — **repoya asla koymayın** (`.env` git’e dâhil değildir):
   - `STRIPE_SECRET_KEY` = `sk_test_...` (canlıda `sk_live_...`)
   - `STRIPE_PUBLISHABLE_KEY` = `pk_test_...` (canlıda `pk_live_...`)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...` (webhook kullanacaksanız)
4. **Deploy** edin. Site `https://<site-adi>.netlify.app` adresinde yayınlanır.
5. **Webhook (opsiyonel):** Stripe Dashboard → Developers → Webhooks → endpoint olarak `https://<site-adi>.netlify.app/api/webhook`, event olarak `checkout.session.completed`. Signing secret’ı (`whsec_...`) Netlify ortam değişkenine ekleyin.

> Ortam değişkenini her değiştirdiğinizde Netlify’de yeniden deploy (**Trigger deploy → Clear cache and deploy**) gerekir.

### Netlify’i lokal simüle etme (opsiyonel)
Function’ları lokalde denemek için Netlify CLI:

```bash
npm i -g netlify-cli
netlify dev            # public/ + functions birlikte, redirect’lerle
```

### Stripe akışı (Embedded Checkout)
1. Kullanıcı LivU ID girer, paket seçer ve **Kartla Öde**’ye tıklar.
2. İstemci `GET /api/config` ile publishable key’i alır ve Stripe.js’i başlatır.
3. `POST /api/create-checkout-session` sunucuda TRY cinsinden `ui_mode: "embedded"` bir **Checkout Session** (`payment_method_types: ["card"]`) oluşturup `client_secret` döner.
4. Stripe’ın güvenli ödeme formu **sayfadaki modal içinde** açılır; kart verisi hiçbir zaman bu siteye girmez (SAQ A).
5. Ödeme sonrası kullanıcı `return.html`’e döner; `GET /api/session-status` ile sonuç gösterilir.
6. `checkout.session.completed` webhook’u ödeme onaylandığında coin’leri ilgili LivU ID’ye tanımlamak için kullanılır (`netlify/functions/webhook.js` ve `server.js` içinde `TODO`).

## Müşteri hizmetleri
Alt bilgideki **Müşteri Hizmetleri** butonu; isim, soyisim, e-posta, telefon, hesap bilgisi (LivU ID), işlem ID ve sorun tanımı içeren bir form açar. Form **Netlify Forms** ile toplanır (ekstra servis/anahtar gerekmez) ve Netlify submission’ı `eren@omegadijital.com`’a **bildirim e-postası** olarak gönderir. Doğrudan e-posta: `eren@omegadijital.com`.

**Netlify Forms kurulumu (tek seferlik, panelden):**
1. Formun tanınması otomatiktir — `public/index.html` içinde `<form name="support" data-netlify="true">` mevcut. İlk deploy’dan sonra Netlify formu keşfeder.
2. Netlify → **Forms** sekmesine gidin → `support` formunu görün.
3. **Forms → Settings & notifications → Add notification → Email notification** → alıcı olarak `eren@omegadijital.com` girin.

> Not: Netlify Forms yalnızca **canlı Netlify deploy’unda** çalışır; lokal `npm start`’ta form gönderimi yalnızca sunucu loglarına yazılır (e-posta gitmez).

## Notlar
- Marka rengi: `#6b10ff` · Slogan: *Be lively & Be happy*
- Visa & Mastercard logoları alt bilgide ve kart ödeme satırında yer alır.
- Hizmet Koşulları / Gizlilik Politikası içerikleri orijinal LivU belgelerinden Türkçe’ye derlenip sadeleştirilmiştir; bağlayıcı tam sürüm için LivU ile iletişime geçilmelidir.
