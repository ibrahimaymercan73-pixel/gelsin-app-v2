-- ============================================================
-- Müşteri destek talepleri (support_tickets)
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  related_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_insert" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_select" ON support_tickets;

-- Müşteri sadece kendi taleplerini oluşturabilir ve görebilir
CREATE POLICY "support_tickets_insert"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "support_tickets_select"
  ON support_tickets FOR SELECT
  USING (auth.uid() = customer_id);
