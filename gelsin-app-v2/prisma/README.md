# Prisma (isteğe bağlı)

`schema.prisma` içindeki **`OtpCode`** modeli, Supabase’deki `login_phone_otps` tablosu ile eşleşir (`@@map("login_phone_otps")`).

Kullanmak için:

1. `supabase-migration-login-phone-otps.sql` dosyasını Supabase SQL Editor’da çalıştırın.
2. `npm i prisma @prisma/client` ve `.env` içinde `DATABASE_URL` tanımlayın.
3. `npx prisma generate`

Projede varsayılan veri erişimi Supabase JS istemcisi ile yapılmaya devam eder.
