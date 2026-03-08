-- ============================================================
-- provider_profiles SELECT: wallet_balance hassas veri
-- Sadece kendi kaydı veya admin tüm satırları görebilir.
-- Not: provider_list_public view bu tabloyu kullanıyorsa, giriş yapmamış veya
-- başka kullanıcılar için liste boş döner; gerekirse SECURITY DEFINER
-- fonksiyon ile wallet_balance olmadan public liste sağlanabilir.
-- Supabase Dashboard > SQL Editor'da çalıştırın.
-- ============================================================

DROP POLICY IF EXISTS "provider_profiles_select" ON provider_profiles;

CREATE POLICY "provider_profiles_select"
  ON provider_profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
