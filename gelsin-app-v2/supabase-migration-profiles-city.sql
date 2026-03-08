-- ============================================================
-- profiles tablosuna şehir alanı (kayıt/onboarding)
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
