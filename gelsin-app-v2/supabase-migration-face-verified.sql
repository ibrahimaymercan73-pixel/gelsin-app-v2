-- Yüz doğrulama (selfie) için profiles.face_verified alanı
-- Supabase SQL Editor'da çalıştırın.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT false;

-- Müşteri tarafında uzman kartında rozet göstermek için view'a ekle
CREATE OR REPLACE VIEW profiles_public AS
  SELECT id, full_name, avatar_url, face_verified
  FROM profiles;
