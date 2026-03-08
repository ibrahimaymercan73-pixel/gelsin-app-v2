-- ============================================================
-- provider_services tablosuna şehir alanı
-- Müşteri tarafında filtreleme uygulama katmanında yapılır
-- (city = kullanıcı şehri OR city = 'Türkiye Geneli')
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

ALTER TABLE public.provider_services ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS idx_provider_services_city ON provider_services(city) WHERE status = 'active';
