-- ============================================================
-- MESSAGES TABLOSUNA is_read SÜTUNU (Okundu bilgisi)
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Alıcı sadece kendine gelen mesajları okundu işaretleyebilsin
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
FOR UPDATE USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
