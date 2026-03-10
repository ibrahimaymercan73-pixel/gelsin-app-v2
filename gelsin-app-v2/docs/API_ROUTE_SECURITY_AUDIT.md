# API Route Güvenlik Tarama Raporu

Tarih: 2025-03  
Kapsam: `app/api/**/route.ts` ve `src/api/` (ikinci klasör projede yok)

---

## 1. Route dosyaları özeti

| Dosya | Auth kontrolü | Admin/rol kontrolü | Service role kullanımı | Sonuç |
|-------|----------------|---------------------|-------------------------|--------|
| `app/api/send-email/offer-accepted/route.ts` | ❌ Yok | ❌ Yok | Sadece server-side ✅ | ❌ **Açık** |
| `app/api/send-email/new-offer/route.ts` | ❌ Yok | ❌ Yok | Sadece server-side ✅ | ❌ **Açık** |
| `app/api/book-service/route.ts` | ✅ Var (session) | N/A (müşteri) | Sadece server-side ✅ | ✅ **Güvenli** |
| `app/api/upload/route.ts` | ✅ Var (session) | N/A | Sadece server-side ✅ | ✅ **Güvenli** |

**`src/api/`** altında route dosyası yok (Next.js App Router kullanılıyor).

---

## 2. Detaylı bulgular

### ❌ `app/api/send-email/offer-accepted/route.ts`
- **Auth:** Yok. Body’den `job_id` ve `provider_id` alıyor; kimlik doğrulama yok.
- **Risk:** Herhangi biri POST atarak teklif kabul edilmiş gibi e-posta tetikleyebilir (spam / bilgi sızıntısı).
- **Service role:** `SUPABASE_SERVICE_ROLE_KEY` sadece server’da kullanılıyor ✅

### ❌ `app/api/send-email/new-offer/route.ts`
- **Auth:** Yok. Body’den `job_id`, `provider_id`, `price` alıyor.
- **Risk:** Herhangi biri müşteriye sahte “yeni teklif” maili gönderebilir.
- **Service role:** Sadece server-side ✅

### ✅ `app/api/book-service/route.ts`
- **Auth:** `createServerClient` + `supabaseAuth.auth.getUser()`; `!user` → 401.
- **Rol:** Müşteri işlemi; admin kontrolü gerekmiyor.
- **Service role:** Auth sonrası iş için kullanılıyor; sadece server-side ✅

### ✅ `app/api/upload/route.ts`
- **Auth:** `createServerClient` + `getUser()`; `!user` → 401.
- **Ek:** Bucket kısıtı (`job-media` / `documents`), boyut, MIME ve magic-byte kontrolü var.
- **Service role:** Sadece server-side ✅

---

## 3. Escrow / ödeme serbest bırakma

**Ödeme serbest bırakma** bir **API route** üzerinden değil, **Supabase RPC** ile yapılıyor:

- **Fonksiyon:** `release_payment(p_job_id UUID)` (`supabase-schema.sql` ~248)
- **Çağıranlar:**
  - **Admin:** `app/admin/finance/page.tsx` → `supabase.rpc('release_payment', { p_job_id: jobId })`
  - **Usta:** `app/provider/my-jobs/page.tsx` → `supabase.rpc('release_payment', { p_job_id: jobId })`

**RPC içeriği:**  
Fonksiyon `SECURITY DEFINER` ile tanımlı; içeride **çağıranın kim olduğu (auth.uid()) veya admin/usta rolü kontrol edilmiyor**. Sadece `p_job_id` ile işi bulup ödemeyi serbest bırakıyor.

**Sonuç:**  
Eğer Supabase tarafında `release_payment` herhangi bir authenticated kullanıcıya açıksa (varsayılan davranış), **herhangi bir giriş yapmış kullanıcı herhangi bir iş için ödeme serbest bırakma** tetikleyebilir. Bu **kritik** bir güvenlik açığıdır.

**Öneri:**  
- RPC içinde çağıranı kontrol et: `auth.uid()` ya bu işin `provider_id`’si ya da `profiles` üzerinden `role = 'admin'` olmalı; değilse `RAISE EXCEPTION`.
- İstersen bu işlemi tamamen bir **API route**’a taşıyıp orada session + admin/provider kontrolü yap; RPC’yi sadece bu route’un (service role veya güvenli bağlamın) çağırmasına izin ver.

---

## 4. Service role / supabaseAdmin kullanım yerleri

| Konum | Kullanım | Server-side? |
|--------|----------|----------------|
| `app/api/send-email/offer-accepted/route.ts` | `createClient(url, serviceKey)` | ✅ Evet (Route Handler) |
| `app/api/send-email/new-offer/route.ts` | `createClient(url, serviceKey)` | ✅ Evet |
| `app/api/book-service/route.ts` | `createClient(url, serviceKey)` | ✅ Evet (auth sonrası) |
| `app/api/upload/route.ts` | `createClient(url, serviceKey)` | ✅ Evet (auth sonrası) |

Tümü Next.js **server** Route Handler içinde; `SUPABASE_SERVICE_ROLE_KEY` client’a gönderilmiyor ✅

---

## 5. Özet tablo (sonuç)

| Dosya | Sonuç | Not |
|-------|--------|-----|
| `app/api/send-email/offer-accepted/route.ts` | ❌ Açık | Auth yok |
| `app/api/send-email/new-offer/route.ts` | ❌ Açık | Auth yok |
| `app/api/book-service/route.ts` | ✅ Güvenli | Session kontrolü var |
| `app/api/upload/route.ts` | ✅ Güvenli | Session kontrolü var |
| Escrow serbest bırakma (RPC `release_payment`) | ❌ Açık | RPC içinde çağıran/rol kontrolü yok |

---

## 6. Yapılması önerilen düzeltmeler

1. **send-email/offer-accepted**  
   En azından ilgili işin müşterisi veya yetkili bir kullanıcı olduğunu session/cookie ile doğrula; veya bu endpoint’i sadece güvenilir server tarafından (örn. iş kabul edildiğinde tek noktadan) çağır.

2. **send-email/new-offer**  
   Aynı şekilde: teklifi atan usta veya yetkili tarafla eşleşen bir auth kontrolü ekle veya sadece güvenilir server akışından çağır.

3. **release_payment RPC**  
   - RPC gövdesinin başında:  
     - Bu işin `provider_id = auth.uid()` VEYA  
     - `(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`  
     kontrolü; sağlanmıyorsa hata fırlat.  
   - Alternatif: Ödeme serbest bırakmayı bir API route’a taşıyıp orada session + admin/provider kontrolü yap; RPC’yi sadece bu route’un service role ile çağırmasına izin ver.

Bu rapor, `app/api/` ve `src/api/` altındaki route’lar ile escrow/ödeme serbest bırakma akışının güvenlik durumunu özetler.
