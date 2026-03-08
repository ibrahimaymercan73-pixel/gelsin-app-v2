# GELSİN – Mail Bildirimleri (Supabase Edge Functions + Resend)

Bu dokümanda, **yeni teklif** ve **teklif kabul** senaryoları için Supabase Edge Functions ile Resend entegrasyonunun nasıl kurulacağı adım adım anlatılmaktadır.

---

## 1. Resend Hesabı ve API Key

1. [Resend](https://resend.com) hesabı açın (yoksa).
2. **API Keys** bölümünden yeni bir API key oluşturun.
3. Gönderici e-posta için **Domains** kısmında `gelsin.dev` (veya kullandığınız domain) doğrulayın. Doğrulama yapmadan test için `onboarding@resend.dev` kullanabilirsiniz (sadece kendi e-postanıza gider).

---

## 2. Edge Functions’ları Deploy Etme

### 2.1 Supabase CLI (yüklü değilse)

```bash
npm install -g supabase
```

Proje dizininde giriş:

```bash
cd gelsin-app-v2
supabase login
supabase link --project-ref <PROJECT_REF>
```

`<PROJECT_REF>`: Supabase Dashboard → Project Settings → General → Reference ID.

### 2.2 Secret’ları Tanımlama

Edge Functions’ların Resend kullanabilmesi için secret’ları ekleyin:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set GELSIN_FROM_EMAIL="Gelsin <bildirim@gelsin.dev>"
```

- `RESEND_API_KEY`: Resend’den aldığınız API key (zorunlu).
- `GELSIN_FROM_EMAIL`: Gönderici adı ve adres (isteğe bağlı; yoksa `bildirim@gelsin.dev` kullanılır).

### 2.3 Deploy (JWT doğrulaması kapalı)

Webhook’lar kullanıcı JWT’si göndermediği için her iki fonksiyonu **JWT doğrulaması kapalı** deploy edin:

```bash
supabase functions deploy send-email-new-offer --no-verify-jwt
supabase functions deploy send-email-offer-accepted --no-verify-jwt
```

Başarılı deploy’dan sonra fonksiyon URL’leri:

- `https://<PROJECT_REF>.supabase.co/functions/v1/send-email-new-offer`
- `https://<PROJECT_REF>.supabase.co/functions/v1/send-email-offer-accepted`

---

## 3. Database Webhooks’ları Oluşturma

Supabase Dashboard üzerinden:

1. **Database** → **Webhooks** (veya **Integrations** → **Webhooks**) sayfasına gidin.
2. **Create a new webhook** ile iki ayrı webhook oluşturun.

### Webhook 1: Yeni Teklif (Müşteriye mail)

| Ayar        | Değer |
|------------|--------|
| Name       | `offer-insert-send-email` |
| Table      | `offers` |
| Events     | **Insert** (sadece) |
| Type       | **Supabase Edge Functions** (veya HTTP URL) |
| Function   | `send-email-new-offer` |

Eğer “Edge Function” seçeneği yoksa, **HTTP** seçip URL’yi elle girin:

- **URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/send-email-new-offer`
- **HTTP method:** POST  
- Gerekirse **Headers** kısmına:  
  `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`  
  (Service role key: Project Settings → API → service_role secret)

### Webhook 2: Teklif Kabul (Ustaya mail)

| Ayar        | Değer |
|------------|--------|
| Name       | `offer-update-accepted-send-email` |
| Table      | `offers` |
| Events     | **Update** (sadece) |
| Type       | **Supabase Edge Functions** (veya HTTP URL) |
| Function   | `send-email-offer-accepted` |

HTTP ile yapacaksanız:

- **URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/send-email-offer-accepted`
- **Method:** POST  
- İsteğe bağlı: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

Kaydedin.

---

## 4. (İsteğe Bağlı) SQL ile Trigger Tanımlama

**Önerilen yöntem Dashboard Webhooks’tur.** Aynı mantığı SQL ile kurmak isterseniz, projenizde **Database Webhooks** için kullanılan tetikleyici/payload formatının `type`, `table`, `record`, `old_record` alanlarını gönderdiğinden emin olun. Edge Function’lar bu formata göre yazılmıştır.

Bazı Supabase sürümlerinde **Integrations → Webhooks** ekranında **Send to Edge Function** seçeneği vardır; bu durumda sadece event + tablo seçip fonksiyonu seçmeniz yeterlidir.

---

## 5. Test Etme

1. **Yeni teklif:** Uygulamada bir iş ilanı oluşturup başka bir hesapla (usta) teklif verin. İlan sahibi (müşteri) e-postasına **“İşine Yeni Bir Teklif Geldi! 💰”** konulu mail gelmeli.
2. **Teklif kabul:** Müşteri hesabıyla bir teklifi kabul edin. Teklifi veren ustanın e-postasına **“Tebrikler, İş Senin! 🎉”** konulu mail gelmeli.

Hata durumunda:

- **Supabase Dashboard** → **Edge Functions** → ilgili fonksiyon → **Logs**
- **Resend** → **Logs** (gönderim / hata)

---

## 6. Özet

| Senaryo              | Tetikleyici     | Alıcı   | Konu                              |
|----------------------|-----------------|---------|-----------------------------------|
| Yeni teklif          | `offers` INSERT | Müşteri | İşine Yeni Bir Teklif Geldi! 💰   |
| Teklif kabul edildi  | `offers` UPDATE (status=accepted) | Usta | Tebrikler, İş Senin! 🎉           |

- Mail içerikleri **GELSİN** mavi–turuncu temasına uyacak şekilde Edge Function içinde HTML olarak üretilir.
- Gönderim **Resend** ile yapılır; `RESEND_API_KEY` ve isteğe bağlı `GELSIN_FROM_EMAIL` secret’ları kullanılır.
