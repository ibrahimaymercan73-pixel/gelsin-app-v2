# Supabase Auth 403 Hatası – Çözüm – 403 için çoğu zaman yanlış anahtar (Service Role yerine anon key kullanın)

`/auth/v1/user` için **403** alıyorsanız aşağıdakileri Supabase Dashboard’da kontrol edin.

## 1. Doğru anahtar kullanılıyor mu?

- **Browser/client** tarafında sadece **anon (public)** key kullanılmalı.
- **Service Role** key asla frontend’de veya `NEXT_PUBLIC_*` ile kullanılmamalı; 403 veya güvenlik hatası verebilir.
- Dashboard → **Project Settings** → **API** → **Project API keys**:
  - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` olarak `.env.local` ve Vercel env’de tanımlı olmalı.

## 2. URL izinleri (Authentication)

- **Authentication** → **URL Configuration**:
  - **Site URL:** Canlı site adresiniz (örn. `https://gelsin-app.vercel.app`).
  - **Redirect URLs:** En az şunlar ekli olmalı:
    - `https://your-production-domain.com/**`
    - `http://localhost:3000/**` (yerel geliştirme için)
  - İstek atan **origin** (tarayıcı adresi) bu listeyle uyumlu olmazsa auth isteği 403 dönebilir.

## 3. Proje durumu

- **Project Settings** → **General**: Proje **Paused** değil mi? (Free tier uzun süre kullanılmazsa duraklar.)

## 4. Vercel ortam değişkenleri

- Vercel → **Project** → **Settings** → **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` tanımlı mı?
  - Deploy sonrası değiştiyseniz **Redeploy** yapın.

## 5. Hızlı test

- Aynı projede **Supabase Dashboard** → **Authentication** → **Users** üzerinden bir kullanıcı oluşturup e-posta/şifre ile giriş deneyin.
- Hâlâ 403 alıyorsanız sorun büyük ihtimalle **Site URL / Redirect URLs** veya **yanlış anahtar** (service_role vs anon) kullanımıdır.
