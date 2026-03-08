# GELSİN — Siber Güvenlik & QA Denetim Raporu (Production Öncesi)

**Kapsam:** Frontend, Supabase veritabanı/RLS, Middleware, Layouts, Formlar, Dosya yükleme, Performans, UI/UX ve yasal eksiklikler.  
**Not:** Kod yazılmadı; yalnızca tespitler ve çözüm önerileri listelenmiştir.

---

## 1. Veritabanı ve API Güvenliği (Supabase RLS & Auth)

### Kırmızı alarmlar

- **Profiller herkese açık okunuyor**  
  `profiles` tablosunda `profiles_select` politikası `USING (true)` ile tanımlı. Giriş yapmamış (anon) veya herhangi bir kullanıcı tüm profilleri (telefon, ad soyad vb.) okuyabilir. Bu, KVKK ve veri sızıntısı riski oluşturur.

- **Reviews tablosunda RLS politikası yok**  
  `reviews` için `ALTER TABLE reviews ENABLE ROW LEVEL SECURITY` var ancak hiçbir `CREATE POLICY` tanımlanmamış. Sonuç: RLS açık olduğu için varsayılan olarak tüm erişim reddedilir; `reviews` için SELECT/INSERT kodda kullanıldığı için ya production’da hata alınır ya da politikalar başka bir migration’da (projede görünmüyor) tanımlıdır. Eksikse bir usta başka işlere yorum ekleyebilir veya yorumları okuyamazsınız.

- **Notifications INSERT politikası eksik**  
  `notifications` için yalnızca `notifications_select` ve `notifications_update` var; `notifications_insert` yok. Kod (ör. teklif kabul edildiğinde) client’tan `notifications.insert` yapıyor. RLS açıksa bu insert’ler production’da reddedilir veya politikalar dashboard’da tanımlıdır; schema ile senkron değilse veri tutarsızlığı ve güvenlik açığı riski vardır.

- **Açık işler (open jobs) giriş yapmadan okunabiliyor**  
  `jobs_select` politikasında `status = 'open'` koşulu var; `auth.uid()` kontrolü olmadan açık işler anon key ile okunabilir. Bu, “açık iş listesi herkese açık olsun” isteniyorsa bilinçli bir tercih olabilir; değilse kısıtlanmalı.

- **Transactions’a INSERT politikası yok**  
  `transactions` için sadece `transactions_select` var. INSERT’ler muhtemelen sadece `release_payment` gibi SECURITY DEFINER fonksiyonlarla yapılıyor; buna rağmen tabloda INSERT için açık bir RLS politikası olmaması, ileride yanlışlıkla client’tan insert eklenirse veri bütünlüğü riski doğurur (en azından dokümante edilmeli veya “sadece fonksiyon” kuralı netleştirilmeli).

### Çözüm önerileri

- `profiles_select`: Sadece kendi profilini veya (ör. uzman listesi için) gerekli minimum alanları okuyacak şekilde kısıtlayın; telefon gibi hassas alanları rol/hedefe göre kısıtlayın veya ayrı bir “public profile” view kullanın.
- `reviews`: En azından SELECT (ilgili job’ın customer/provider’ı veya admin), INSERT (sadece ilgili customer, iş tamamlandıktan sonra) ve gerekirse UPDATE/DELETE için politikalar yazın; schema’yı ve migration’ları buna göre güncelleyin.
- `notifications`: Client’ın sadece “kullanıcıya bildirim oluşturma” senaryolarına izin verecek şekilde `notifications_insert` politikası ekleyin veya bildirimleri yalnızca backend/trigger ile oluşturun ve client insert’i kaldırın.
- Açık işlerin anon okunması istenmiyorsa `jobs_select` içinde `status = 'open'` kolunu `auth.uid() IS NOT NULL` ile birleştirin veya ayrı bir “public jobs” view kullanın.
- Middleware: Korunan route’lar doğru; giriş yapmadan `/customer`, `/provider`, `/admin` erişilemiyor. `/register` matcher’da yok; gerekirse ekleyin (şu an davranış kabul edilebilir).

---

## 2. Dosya Yükleme (Storage) Zafiyetleri

### Kırmızı alarmlar

- **İş oluştururken (new-job) yalnızca boyut sınırı var, format/MIME kontrolü zayıf**  
  Client’ta 10MB sınırı ve `file.type.startsWith('video/')` / genel “image” ayrımı var; uzantı sadece path için kullanılıyor. Dosya uzantısı (.jpg, .png) değiştirilerek zararlı veya yürütülebilir içerik (ör. .php, .exe, script) yüklenebilir. Supabase Storage tarafında MIME/boyut/uzantı kısıtı ve malware taraması görünmüyor.

- **Uzman belge yükleme (provider profile) sınırsız**  
  `documents` bucket’ına `uploadDoc` ile yükleme yapılıyor; client’ta sadece `accept="image/*,.pdf"` var. Boyut (max size) ve sunucu tarafında format/MIME kontrolü yok. Büyük dosyalar veya yanlış türde dosyalar yüklenebilir; bucket’ın private olması link sızıntısı riskini azaltır ama zararlı dosya yükleme riski devam eder.

- **Storage bucket RLS politikaları schema’da yok**  
  Şemada yalnızca “documents (private) ve avatars (public) bucket oluşturun” notu var; Storage için RLS politikası tanımı projede görünmüyor. Bucket’lar Supabase Dashboard’da “herkese açık” veya “authenticated herkese yazılabilir” ise yetkisiz erişim/yazma riski vardır.

### Çözüm önerileri

- Yükleme öncesi: Sadece izin verilen MIME türleri (ör. image/jpeg, image/png, application/pdf) ve uzantı whitelist’i (jpg, jpeg, png, pdf) uygulayın; hem client hem de mümkünse Edge/Serverless fonksiyon veya Supabase Storage hook ile doğrulayın.
- Boyut: Provider belge yüklemeleri için makul bir üst sınır (ör. 5MB) getirin; client ve sunucu tarafında kontrol edin.
- Storage RLS: `documents` ve `job-media` (ve varsa `avatars`) için bucket politikalarını tanımlayın (ör. sadece kendi user_id klasörüne yazma, sadece ilgili rollerin okuma). Bu politikaları migration/SQL dosyasına ekleyip dokümante edin.
- İsteğe bağlı: Production’da kritik bucket’lar için virüs/malware taraması (üçüncü parti servis veya Supabase ile entegre çözüm) değerlendirin.

---

## 3. Frontend ve Form Güvenliği (Validation & XSS)

### Kırmızı alarmlar

- **Zod / Yup / merkezi validasyon yok**  
  Projede Zod, Yup veya benzeri bir validasyon kütüphanesi kullanılmıyor. Form alanları (iş başlığı, açıklama, adres, mesaj, profil bio, yorum vb.) yalnızca `trim()`, `alert()` veya basit boş kontrol ile sınırlandırılmış; uzunluk, format ve içerik kuralları merkezi değil. Bu da hem veri kalitesi hem de ileride HTML render edilirse XSS riski oluşturur.

- **Kullanıcı içeriği doğrudan metin olarak render ediliyor**  
  Mesaj gövdesi (`m.body`), bildirim metni ve yorumlar `{m.body}` / `{n.body}` gibi JSX içinde gösteriliyor; `dangerouslySetInnerHTML` kullanılmıyor. React varsayılan olarak escape ettiği için şu an XSS riski düşük; ancak ileride “zengin metin” veya HTML desteklenirse mutlaka sanitization (ör. DOMPurify) ve CSP gerekir.

- **Sunucu tarafı validasyon/sanitization görünmüyor**  
  Veri doğrudan Supabase client ile insert/update ediliyor; Next.js API route veya Server Action ile sunucu tarafı validasyon/sanitization yok. Kötü niyetli veya hatalı client isteği veritabanına ulaşabilir (RLS sadece “kim ne okuyup yazabilir”i kısıtlar, içerik kalitesini değil).

### Çözüm önerileri

- En azından kritik formlar (iş oluşturma, mesaj, profil güncelleme, yorum) için Zod (veya Yup) şemaları tanımlayın; max length, format (telefon, UUID vb.) ve isteğe bağlı basit “tehlikeli pattern” kontrolü yapın. Mümkünse bu validasyonu Server Action veya API route’ta da çalıştırın.
- Hiçbir kullanıcı kaynaklı metni `dangerouslySetInnerHTML` ile render etmeyin; zorunlu kalırsanız DOMPurify ile sanitize edin ve Content-Security-Policy başlığını sıkılaştırın.
- Uzun metin alanları için veritabanı ve şema ile uyumlu max length sınırları koyun (ör. title 200, description 2000, message body 2000).

---

## 4. Mimari ve Performans Darboğazları (Vercel Limitleri)

### Kırmızı alarmlar

- **Sürekli polling ile istek sayısı artıyor**  
  - İş detay sayfası (`customer/jobs/[id]`): Her 7 saniyede bir `load()` (jobs, offers, profiles, provider_profiles, reviews) tetikleniyor.  
  - Sohbet sayfası (`chat/[id]`): Mesajlar 4 saniyede bir, `last_seen` 30 saniyede bir yenileniyor.  
  - Admin canlı sayfa: 15 saniyede bir tam liste çekiliyor.  
  Aynı anda çok sayıda kullanıcı açık sayfa bırakırsa Supabase ve Vercel fonksiyon çağrı limitlerine (özellikle ücretsiz katman) takılma riski yüksek.

- **Görsel kullanımı optimize değil**  
  Medya önizleme ve iş görselleri için `next/image` yerine ham `<img>` kullanılıyor (new-job önizleme, provider/jobs listesi). Boyutlandırma, format (WebP/AVIF) ve lazy loading otomatik değil; gereksiz bant genişliği ve yavaş LCP oluşabilir.

- **N+1 benzeri pattern’ler büyük ölçüde giderilmiş**  
  İş listesi ve detay sayfalarında profiller `.in('id', ids)` ile toplu çekiliyor; tek tek döngü içinde istek atılmıyor. Bu kısım iyi; asıl yük polling ve görsel kullanımından kaynaklanıyor.

### Çözüm önerileri

- Mümkün olduğunca Realtime kullanın: Mesajlar ve (uygunsa) iş/teklif güncellemeleri için Supabase Realtime subscribe ile polling’i kaldırın veya sadece fallback olarak seyrek (ör. 30–60 sn) tutun.
- Polling kalacaksa aralıkları büyütün (ör. 7 sn → 15–20 sn) ve sadece “görünür sekme” veya “sayfa focus” olduğunda çalışacak şekilde (visibilitychange) kısıtlayın.
- Kullanıcı tarafından yüklenen ve liste/detayda gösterilen görseller için `next/image` kullanın; `remotePatterns` ile Supabase Storage domain’ini ekleyin; boyut ve quality ayarları yapın.
- Landing ve listelerde “count” sorgularını (jobs, providers) mümkünse cache’leyin (ISR/revalidate veya kısa TTL) ve gereksiz tekrarları azaltın.

---

## 5. UI/UX ve Yasal Eksiklikler (Marketplace Standartları)

### Kırmızı alarmlar

- **Hata sınırları (Error Boundary) ve 404 yok**  
  `app` altında `error.tsx`, `not-found.tsx` veya `global-error.tsx` dosyası yok. Bir bileşende yakalanmamış hata veya 404 durumunda kullanıcı Next.js varsayılan sayfası veya boş/beyaz ekran görebilir; marka ve güven hissi zayıflar.

- **Yasal ve bilgilendirme sayfaları eksik**  
  Ana sayfada footer yalnızca “GELSİN. — Kapınıza kadar hizmet” metnini içeriyor; Gizlilik Politikası, Kullanım Şartları, KVKK Aydınlatma Metni ve Çerez Politikası gibi linkler yok. Pazar yeri ve kişisel veri işleme için bu sayfalar yasal zorunluluk ve kullanıcı güveni için gereklidir.

- **KVKK sadece admin tarafında referans**  
  Admin onay sayfasında “KVKK uyumlu belge yönetimi” ve “doğrulandı, silindi (KVKK)” ifadeleri var; kullanıcıya dönük KVKK metni, aydınlatma ve açık rıza akışı (kayıt/giriş sırasında veya ayrı sayfa) projede görünmüyor.

### Çözüm önerileri

- En azından `app/error.tsx` (genel hata), `app/not-found.tsx` (404) ve isteğe bağlı `app/global-error.tsx` ekleyin; kullanıcı dostu mesaj ve “Ana sayfaya dön” gibi aksiyonlar verin.
- Footer’a (landing ve gerekirse tüm layout’lara) şu linkleri ekleyin: Gizlilik Politikası, Kullanım Şartları, KVKK Aydınlatma Metni; ilgili statik veya dinamik sayfaları (`/gizlilik`, `/kullanim-sartlari`, `/kvkk`) oluşturun.
- Kayıt/giriş veya ilk kullanımda KVKK metnini okuyup onaylama (checkbox + link) ve gerekirse çerez onayı (cookie banner) ekleyin; yasal danışmanlıkla metinleri netleştirin.

---

## Özet Tablo

| Başlık | Kritiklik | Özet |
|--------|-----------|------|
| **1. RLS & Auth** | Yüksek | profiles herkese açık; reviews politikası yok; notifications insert politikası eksik. |
| **2. Dosya yükleme** | Yüksek | Format/MIME/boyut (provider belge) zayıf; Storage RLS dokümante/değil. |
| **3. Validation & XSS** | Orta | Zod/Yup yok; sunucu validasyon yok; şu an XSS riski düşük (escape). |
| **4. Performans** | Orta | Polling (7/4/15 sn) ve ham img kullanımı limitlere takılma riski. |
| **5. UI/UX & Yasal** | Yüksek | Error/404 sayfaları yok; KVKK/Gizlilik/Şartlar sayfaları ve footer linkleri eksik. |

Bu rapor, mevcut kod ve schema incelemesine dayanmaktadır; canlı ortamda Supabase Dashboard’da eklenmiş politikalar veya farklı migration’lar varsa yerelde görünmeyebilir. Production öncesi Dashboard RLS/Storage politikaları ve environment değişkenleri de gözden geçirilmelidir.
