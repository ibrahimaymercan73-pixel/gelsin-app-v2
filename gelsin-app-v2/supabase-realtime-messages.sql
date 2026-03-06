-- ============================================================
-- MESSAGES TABLOSUNU REALTIME'A EKLE
-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- ============================================================

-- Messages tablosunu realtime publication'a ekle
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Kontrol: Hangi tablolar realtime'da?
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
