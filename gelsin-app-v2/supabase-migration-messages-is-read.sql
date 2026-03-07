-- ============================================================
-- messages tablosuna is_read (okundu bilgisi) ekle
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Alıcı kendi gelen mesajlarını okundu işaretleyebilsin
CREATE POLICY "messages_update_receiver"
ON messages FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
