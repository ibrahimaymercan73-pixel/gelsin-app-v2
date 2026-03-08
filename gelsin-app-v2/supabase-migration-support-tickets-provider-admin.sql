-- ============================================================
-- Destek talepleri: Usta (provider) desteği + Admin görüntüleme/güncelleme
-- Mevcut support_tickets tablosuna provider_id eklenir; admin tüm talepleri görür/günceller.
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1) provider_id sütunu ekle (usta talepleri için)
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 2) customer_id artık nullable (usta talebinde customer_id null olacak)
ALTER TABLE support_tickets
  ALTER COLUMN customer_id DROP NOT NULL;

-- 3) En az biri dolu olmalı
ALTER TABLE support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_customer_or_provider;

ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_customer_or_provider
  CHECK (customer_id IS NOT NULL OR provider_id IS NOT NULL);

-- 4) İndeks
CREATE INDEX IF NOT EXISTS idx_support_tickets_provider_id ON support_tickets(provider_id);

-- 5) RLS politikalarını güncelle
DROP POLICY IF EXISTS "support_tickets_insert" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_select" ON support_tickets;

-- Müşteri: sadece kendi taleplerini oluşturur ve görür
CREATE POLICY "support_tickets_insert"
  ON support_tickets FOR INSERT
  WITH CHECK (
    (customer_id = auth.uid() AND provider_id IS NULL)
    OR
    (provider_id = auth.uid() AND customer_id IS NULL)
  );

CREATE POLICY "support_tickets_select"
  ON support_tickets FOR SELECT
  USING (
    customer_id = auth.uid()
    OR provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin durum güncelleyebilsin
DROP POLICY IF EXISTS "support_tickets_admin_update" ON support_tickets;
CREATE POLICY "support_tickets_admin_update"
  ON support_tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);
