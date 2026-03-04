-- ============================================================
-- TÜM KULLANICILARI VE İLİŞKİLİ VERİYİ SİL
-- Supabase SQL Editor'da DİKKATLİ bir şekilde çalıştırın.
-- Bu işlem GERİ ALINAMAZ.
-- ============================================================

-- Sıra: FK'ları bozmamak için önce alt tablolar, en sonda auth.users

DELETE FROM public.messages;
DELETE FROM public.notifications;
DELETE FROM public.reviews;
DELETE FROM public.transactions;
DELETE FROM public.offers;
DELETE FROM public.jobs;
DELETE FROM public.provider_profiles;
DELETE FROM public.profiles;

-- Auth şeması: önce identities, sonra users (FK sırası)
DELETE FROM auth.identities;
DELETE FROM auth.users;
