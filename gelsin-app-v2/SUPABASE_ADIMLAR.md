# Supabase’de Yapılacaklar (Kısa Rehber)

Bu projede güvenlik güncellemeleri için **bir kez** aşağıdaki adımları Supabase Dashboard’da uygulaman yeterli.

---

## 1. Supabase’e gir

1. [supabase.com](https://supabase.com) → Giriş yap.
2. **Gelsin** projesini seç.

---

## 2. SQL’i çalıştır (RLS + Storage kuralları)

1. Sol menüden **SQL Editor**’e tıkla.
2. **New query** ile yeni sorgu aç.
3. Bilgisayarındaki bu dosyayı aç:  
   **`supabase-migration-rls-and-storage-security.sql`**
4. İçindeki **tüm metni** kopyala (Ctrl+A, Ctrl+C).
5. SQL Editor’e yapıştır (Ctrl+V).
6. Sağ alttan **Run** (veya Ctrl+Enter) ile çalıştır.
7. Altta “Success” veya yeşil onay görürsen tamamdır. Hata çıkarsa hata mesajını kopyalayıp sakla.

Bu tek seferlik işlem şunları yapar:

- Profilleri sadece kendi profilini okuyacak şekilde kısıtlar.
- Yorum (reviews) ve bildirim (notifications) kurallarını ekler.
- Storage’da `documents` ve `job-media` için “sadece kendi klasörüne yaz/oku” kurallarını ekler.

---

## 3. Storage bucket’ları kontrol et

1. Sol menüden **Storage**’a gir.
2. Şu bucket’ların **var olduğundan** emin ol:
   - **documents** (Private)
   - **job-media** (Public)
   - **avatars** (Public, isteğe bağlı)
3. Yoksa **New bucket** ile oluştur; isimleri aynen yaz (documents, job-media).

---

## 4. Service role key’i al (dosya yükleme için)

1. Sol menüden **Settings** (dişli) → **API**.
2. **Project API keys** bölümünde:
   - **anon public** → Zaten frontend’de kullanıyorsun.
   - **service_role** (secret) → Buna tıkla, **Reveal** deyip kopyala.
3. Projendeki **`.env.local`** dosyasına ekle:

```env
SUPABASE_SERVICE_ROLE_KEY=buraya_yapistiracagin_uzun_anahtar
```

4. Dosyayı kaydet. Uygulamayı yeniden başlat (örn. `npm run dev`).

---

## Özet

| Ne yapacaksın?              | Nerede?              |
|----------------------------|----------------------|
| SQL’i çalıştırmak          | SQL Editor           |
| Bucket’ları kontrol etmek  | Storage              |
| Service key’i alıp yazmak  | Settings → API + .env.local |

Bunları yaptıktan sonra Supabase tarafında ekstra bir şey yapmana gerek yok; uygulama bu ayarlarla çalışır.
