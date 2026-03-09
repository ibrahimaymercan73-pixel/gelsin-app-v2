-- Müşterilerin usta profil sayfasında ve teklif kartında sadece public verileri görebilmesi.
-- Hassas alanlar (wallet_balance, iban vb.) view'da yok; uygulama tarafında da select edilmemeli.
-- Supabase SQL Editor'da çalıştırın.

-- 1) provider_profiles: completed_jobs alanı (tamamlanan iş sayısı)
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS completed_jobs INT DEFAULT 0;

-- 2) Müşteri usta bilgilerini okuyabilsin (uygulama sadece public kolonları select etmeli; wallet_balance vb. hassas alanları çekmeyin)
DROP POLICY IF EXISTS "provider_profiles_select_public" ON provider_profiles;
CREATE POLICY "provider_profiles_select_public"
  ON provider_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3) reviews: müşteri yorumları usta profil sayfasında herkese açık görünsün
DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select"
  ON reviews FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4) profiles_public view: city ve face_verified dahil (müşteri usta profilinde şehir göstersin)
CREATE OR REPLACE VIEW profiles_public AS
  SELECT id, full_name, avatar_url, face_verified, city
  FROM profiles;

GRANT SELECT ON profiles_public TO authenticated;
GRANT SELECT ON profiles_public TO anon;
