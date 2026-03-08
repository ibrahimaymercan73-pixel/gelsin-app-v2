-- ============================================================
-- provider_services tablosuna şehir alanı
-- RLS: Müşteri sadece kendi şehri veya 'Türkiye Geneli' ilanları görsün
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

ALTER TABLE public.provider_services ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS idx_provider_services_city ON provider_services(city) WHERE status = 'active';

-- RLS: Kendi ilanları her zaman; aktif ilanlarda şehir = kullanıcı şehri veya Türkiye Geneli (veya city null eski kayıtlar)
DROP POLICY IF EXISTS "provider_services_select" ON provider_services;
CREATE POLICY "provider_services_select"
  ON provider_services FOR SELECT
  USING (
    auth.uid() = provider_id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR (
      status = 'active'
      AND (
        city IS NULL
        OR city = (SELECT city FROM public.profiles WHERE id = auth.uid())
        OR city = 'Türkiye Geneli'
      )
    )
  );
