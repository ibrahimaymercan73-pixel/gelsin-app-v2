# 🏠 Gelsin.app — Kurulum Rehberi

Ev hizmetleri için konum tabanlı pazaryeri platformu.

## Tech Stack
- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend/DB:** Supabase (Auth, Database, Storage, Realtime)
- **Harita:** Leaflet / React-Leaflet
- **QR:** qrcode.react + html5-qrcode

---

## ⚡ Hızlı Başlangıç (Bolt.new)

### 1. Bolt.new'e Projeyi Yükle
1. bolt.new adresine gidin
2. "Import from GitHub" veya "Upload Files" seçin
3. Tüm proje dosyalarını yükleyin

### 2. Supabase Projesi Oluştur
1. [supabase.com](https://supabase.com) üzerinde yeni proje oluşturun
2. Dashboard'dan `SQL Editor` açın
3. **`supabase-schema.sql`** dosyasının tamamını kopyalayıp çalıştırın

### 3. Supabase Storage Bucket'ları Oluştur
Supabase Dashboard > Storage menüsünden:
- **`documents`** bucket oluşturun (Private - kapalı)
- **`avatars`** bucket oluşturun (Public - açık)

### 4. Supabase SMS (OTP) Ayarları
Supabase Dashboard > Authentication > Providers > Phone:
- **Twilio** veya **Messagebird** bağlayın
- Test için: Auth > Settings > "Enable phone confirmations" açın
- Test SMS için Supabase ücretsiz test SMS kotası sunar

### 5. Environment Variables
`.env.local` dosyasını düzenleyin:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

Supabase Dashboard > Settings > API'dan alın.

### 6. Admin Kullanıcı Oluştur
SMS ile giriş yaptıktan sonra, Supabase Dashboard > Table Editor > `profiles` tablosunda `role` sütununu `admin` olarak güncelleyin.

---

## 👥 Kullanıcı Rolleri

| Rol | Giriş | Erişim |
|-----|-------|--------|
| `customer` | SMS OTP | `/customer/*` |
| `provider` | SMS OTP | `/provider/*` |
| `admin` | SMS OTP | `/admin/*` |

---

## 🗂️ Sayfa Yapısı

```
/login              → SMS OTP giriş
/customer           → Müşteri ana sayfa (harita)
/customer/new-job   → Yeni iş oluştur
/customer/jobs      → İş listesi
/customer/jobs/[id] → İş detayı + QR kod
/provider           → Usta paneli
/provider/jobs      → Açık işler + teklif ver
/provider/my-jobs   → Kabul edilen işler + QR okut
/provider/wallet    → Cüzdan
/provider/profile   → Profil + belge yükleme
/admin              → Admin dashboard
/admin/approvals    → İK onay masası
/admin/live         → Canlı operasyon haritası
/admin/finance      → Escrow + ödemeler
/admin/users        → Kullanıcı yönetimi
```

---

## 💰 İş Akışı

```
Müşteri iş açar (status: open)
  → Ustalar teklif verir (offers tablosu)
  → Müşteri teklif kabul eder (status: accepted, escrow_held: true)
  → Usta kapıya gelir, QR kodu okutur (status: started)
  → Usta işi bitirir, admin ödemeyi serbest bırakır
  → %15 platform komisyonu kesilir, kalan ustanın cüzdanına gider
```

---

## 📱 Özellikler

- ✅ SMS OTP ile şifresiz giriş
- ✅ Rol bazlı yönlendirme (Müşteri / Usta / Admin)
- ✅ Harita üzerinde usta konumları (Leaflet)
- ✅ Dinamik QR kod üretme ve tarama
- ✅ Supabase Realtime ile canlı güncellemeler
- ✅ KVKK uyumlu belge yönetimi (onay sonrası otomatik silme)
- ✅ Escrow (havuz) sistemi ve komisyon yönetimi
- ✅ Admin canlı operasyon haritası
# fix
