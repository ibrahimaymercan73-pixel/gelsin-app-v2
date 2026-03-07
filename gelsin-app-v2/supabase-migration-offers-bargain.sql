-- ============================================================
-- Pazarlık akışı: müşteri talep edince uzman "Fiyatı Düşür" görsün
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- Teklif tablosuna pazarlık talebi bayrağı
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS is_bargain_requested BOOLEAN DEFAULT false;

-- Uzman kendi teklifini güncelleyebilsin (fiyat düşürme / is_bargain_requested sıfırlama)
DROP POLICY IF EXISTS "offers_update" ON offers;
CREATE POLICY "offers_update" ON offers FOR UPDATE USING (
  auth.uid() = provider_id
  OR auth.uid() = (SELECT customer_id FROM jobs WHERE id = job_id)
);
