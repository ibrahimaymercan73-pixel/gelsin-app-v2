# Gelsin App – Güvenlik Tarama Raporu

Tarih: 2025-03  
Kapsam: Middleware, RLS, Admin sayfaları, IDOR riskleri

---

## 1. Middleware (`middleware.ts`)

### Hangi route'lar korunuyor, hangileri açık?

**Matcher (middleware’in çalıştığı path’ler):**
- `/customer/:path*`
- `/provider/:path*`
- `/admin/:path*`
- `/role-selection`, `/choose-role`, `/onboarding`, `/login`, `/forgot-password`, `/update-password`, `/`

| Durum | Açıklama |
|-------|----------|
| ✅ | `/customer/*`, `/provider/*`, `/admin/*` → Matcher’da; auth + rol yönlendirmesi uygulanıyor. |
| ❌ | **`/chat/*` matcher’da yok** → Middleware hiç çalışmıyor. Giriş yapmamış biri `/chat/<job_id>` açabilir. RLS sayesinde başkasının mesajları gelmez ama sayfa yüklenir; `status = 'open'` işlerde iş detayı görülebilir. |
| ✅ | `/api/*` sunucu tarafı route; matcher’da olmasa da API route’lar kendi auth kontrollerini yapıyor (önceki audit’te düzeltildi). |

### /admin/* auth + role=admin kontrolü

| Kontrol | Sonuç |
|---------|--------|
| Giriş yoksa | `!user` → `/login` yönlendirme ✅ |
| Rol yoksa | `!role` → `/choose-role` ✅ |
| Admin alanı | `isAdminArea && role !== 'admin'` → `/customer` ✅ |

**Özet:** `/admin/*` route’ları middleware ile korunuyor; sadece giriş yapmış ve `role === 'admin'` kullanıcılar admin path’lerine girebiliyor.

### /provider/* ve /customer/* auth kontrolü

| Alan | Auth | Rol yönlendirme |
|------|------|------------------|
| `/customer/*` | ✅ `!user` → `/login` | ✅ provider → `/provider`, admin → `/admin` |
| `/provider/*` | ✅ `!user` → `/login` | ✅ customer → `/customer`, admin → `/admin` |

**Özet:** Hem auth hem rol bazlı yönlendirme var. Usta onboarding kontrolü de var (onboard değilse `/provider/onboarding`).

---

## 2. Supabase RLS Politikaları

Kaynak: `supabase-schema.sql` + `supabase-migration-rls-and-storage-security.sql` + `supabase-migration-provider-services.sql`

### Her tablo için RLS açık mı?

| Tablo | RLS Açık | Not |
|-------|----------|-----|
| profiles | ✅ | Evet |
| provider_profiles | ✅ | Evet |
| jobs | ✅ | Evet |
| offers | ✅ | Evet |
| reviews | ✅ | Evet (migration’da güncellenmiş) |
| transactions | ✅ | Evet |
| notifications | ✅ | Evet |
| messages | ✅ | Evet |
| provider_services | ✅ | Evet (migration) |
| service_categories | ❌ | RLS yok; referans/kategori verisi, herkese açık kabul edilebilir ✅ |

### jobs tablosu – Müşteri sadece kendi işlerini görebiliyor mu?

- **SELECT:** `auth.uid() = customer_id OR auth.uid() = provider_id OR status = 'open' OR admin`
- Müşteri: Kendi işleri (`customer_id`) + kendisine atanmış işler (`provider_id` müşteri değil, usta) aslında sadece `customer_id` ile kendi işleri.
- **Açık işler:** `status = 'open'` herkese açık (kasıtlı; ilan listesi).
- **Sonuç:** ✅ Müşteri kendi işlerini görüyor; açık işler herkes görüyor (tasarım gereği).

### offers tablosu – Usta sadece kendi tekliflerini görebiliyor mu?

- **SELECT:** `auth.uid() = provider_id OR auth.uid() = (SELECT customer_id FROM jobs WHERE id = job_id)`
- Usta: Sadece `provider_id = auth.uid()` olan teklifler.
- Müşteri: Sadece kendi işindeki teklifler (job’ın customer_id’si).
- **Sonuç:** ✅ Usta sadece kendi tekliflerini, müşteri sadece kendi işinin tekliflerini görüyor.

### profiles tablosu – Kullanıcı sadece kendi profilini düzenleyebiliyor mu?

- **SELECT (schema):** İlk hali `USING (true)` → migration’da kaldırıldı.
- **SELECT (migration sonrası):** `profiles_select_own`: `auth.uid() = id`; admin: `profiles_select_admin` ile tüm profiller.
- **UPDATE:** `auth.uid() = id` ✅
- **INSERT:** `auth.uid() = id` ✅
- **Sonuç:** ✅ Kullanıcı sadece kendi profilini okuyup güncelleyebiliyor; admin hepsini okuyabiliyor.

### wallet / payments (transactions + provider_profiles)

| Veri | Politika | Sonuç |
|------|----------|--------|
| **transactions** | SELECT: `auth.uid() = from_id OR auth.uid() = to_id` | ✅ Kullanıcı sadece kendi işlemlerini görüyor. |
| **provider_profiles** (wallet_balance) | SELECT: `USING (true)` | ⚠️ **Riskli** – Usta cüzdan bakiyesi herkese açık. Tasarım bilinçli olabilir (şeffaflık); hassas sayılıyorsa kısıtlanmalı. |

**Not:** `transactions` için INSERT/UPDATE policy yok; ekleme/güncelleme sadece `release_payment` gibi SECURITY DEFINER fonksiyonlarla yapılıyor ✅.

---

## 3. Admin sayfaları (`app/admin/**`)

| Sayfa | role=admin kontrolü | Not |
|-------|---------------------|-----|
| `layout.tsx` | ✅ | `getCurrentUserAndRole()`; `role !== 'admin'` → `router.replace('/customer')` |
| `page.tsx` (Özet) | ✅ | Layout üzerinden; ayrıca kontrol yok, layout yeterli |
| `approvals/page.tsx` | ✅ | Layout |
| `users/page.tsx` | ✅ | Layout |
| `live/page.tsx` | ✅ | Layout |
| `finance/page.tsx` | ✅ | Layout |
| `messages/page.tsx` | ✅ | Layout |
| `support/page.tsx` | ✅ | Layout |

**Sonuç:** Tüm admin sayfaları tek bir layout altında; layout’ta `role === 'admin'` kontrolü var. Ayrı sayfa bazlı tekrarlı kontrol yok ama **✅ güvenli** (layout zorunlu giriş noktası).

---

## 4. IDOR riski – URL’de job_id / user_id ve sahiplik

### Dinamik route’lar ve sahiplik

| Route | Parametre | Sahiplik / yetki | Sonuç |
|-------|-----------|-------------------|--------|
| `/customer/jobs/[id]` | job `id` | Veri `jobs` + `offers` + RPC’lerden; RLS ile sadece bu işin customer/provider’ı veya admin veri alır. | ✅ RLS ile korunuyor |
| `/customer/services/[id]` | service `id` | `provider_services`; RLS SELECT `status = 'active' OR auth.uid() = provider_id`. Aktif ilanlar herkese açık (vitrin). | ✅ Tasarıma uygun |
| `/customer/chat/[id]` | job `id` | Aslında `app/chat/[id]` kullanılıyor; aynı sayfa. | Aşağıdaki `/chat/[id]` ile aynı |
| `/provider/chat/[id]` | job `id` | Aynı şekilde `app/chat/[id]`. | Aynı |
| **`/chat/[id]`** | job `id` | **Middleware’de yok** → giriş zorunlu değil. Giriş varsa job + mesajlar RLS ile filtreleniyor (sadece customer/provider görür). | ⚠️ Route açık; veri RLS ile kısıtlı |
| `/admin/finance` | jobId (body/click) | Admin; `release_payment` RPC içinde admin kontrolü var. | ✅ |
| `/admin/messages` | - | Liste RLS ile (admin tüm mesajları görebilir). | ✅ |
| `provider/my-jobs` | jobId (state/modal) | Liste zaten `provider_id = user.id` veya teklif verilen işler; `completeAction` sadece bu listedeki job’lar için. RPC `release_payment` provider/admin kontrolü yapıyor. | ✅ |

### Özet IDOR

- **job_id / user_id içeren sayfalar:** Veri erişimi **RLS** ve (admin/usta için) **RPC yetki kontrolleri** ile kısıtlı.
- **Eksik olan:** `/chat/*` path’inin middleware’e eklenmesi; böylece giriş yapmamış kullanıcı bu sayfaya hiç düşmez.

---

## 5. Ek bulgular

| Konu | Durum | Öneri |
|------|--------|--------|
| **notifications INSERT** | ⚠️ | Policy: `user_id <> auth.uid()`; herhangi bir kullanıcı başka herhangi bir kullanıcıya bildirim ekleyebilir (spam/yanıltma riski). | İsteğe bağlı: INSERT’i sadece belirli tiplerle (örn. sistem/job ile ilişkili) veya service role ile sınırla. |
| **provider_profiles SELECT true** | ⚠️ | `wallet_balance` dahil tüm alanlar herkese açık. | Bakiye hassas sayılıyorsa SELECT’i kendi kaydı + admin ile sınırla. |
| **service_categories RLS yok** | ✅ | Sadece referans/kategori verisi; genelde public kabul edilir. | İsteğe bağlı: Salt okunur RLS (SELECT true) eklenebilir. |

---

## 6. Özet tablo

| # | Konu | Sonuç |
|---|------|--------|
| 1 | Middleware: /customer, /provider, /admin korunuyor mu? | ✅ Güvenli |
| 2 | Middleware: /admin için role=admin? | ✅ Güvenli |
| 3 | Middleware: /chat matcher’da mı? | ❌ Açık (route korunmuyor) |
| 4 | RLS: Tüm kritik tablolarda RLS var mı? | ✅ (service_categories hariç; kabul edilebilir) |
| 5 | jobs: Müşteri sadece kendi işleri? | ✅ Güvenli |
| 6 | offers: Usta sadece kendi teklifleri? | ✅ Güvenli |
| 7 | profiles: Sadece kendi profil düzenleme? | ✅ Güvenli |
| 8 | transactions: Sadece kendi işlemler? | ✅ Güvenli |
| 9 | provider_profiles (wallet_balance) herkese açık mı? | ⚠️ Riskli (tasarım tercihi) |
| 10 | Admin sayfalarında role kontrolü? | ✅ Güvenli (layout) |
| 11 | IDOR: job_id/user_id sahiplik kontrolü? | ✅ RLS/RPC ile güvenli |
| 12 | notifications INSERT herkese açık mı? | ⚠️ Riskli (spam/yanıltma) |

---

## 7. Önerilen düzeltmeler (kısa)

1. **Middleware:** `config.matcher` içine `'/chat/:path*'` ekle; `/chat/*` için de auth (ve istenirse rol) kontrolü uygulansın.
2. **Bildirim spam’i:** notifications INSERT policy’yi sıkılaştır (örn. sadece ilgili job/counterpart veya belirli type’lar).
3. **Cüzdan gizliliği (isteğe bağlı):** `provider_profiles` SELECT’i `auth.uid() = id OR admin` yapılırsa `wallet_balance` sadece sahibi ve admin görür.

Bu rapor, mevcut kod ve SQL migration’larına göre hazırlanmıştır; canlı ortamda ek RLS veya migration’lar varsa tekrar gözden geçirilmelidir.
