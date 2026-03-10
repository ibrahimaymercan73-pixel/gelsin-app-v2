-- Destek taleplerine admin yanıtı için ek alanlar
-- Supabase SQL Editor'da çalıştırın.

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

