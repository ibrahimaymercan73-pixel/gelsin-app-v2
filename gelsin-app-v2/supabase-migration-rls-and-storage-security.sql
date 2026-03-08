-- ============================================================
-- GELSİN – RLS ve Storage Güvenlik Migration
-- Supabase SQL Editor'da sırayla çalıştırın.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES: Herkese açık politikayı kaldır, sadece kendi profilini oku
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Diğer kullanıcılar için sadece genel bilgiler: public view
CREATE OR REPLACE VIEW profiles_public AS
  SELECT id, full_name, avatar_url
  FROM profiles;

-- View üzerinden okuma: authenticated ve anon (liste sayfaları için)
GRANT SELECT ON profiles_public TO authenticated;
GRANT SELECT ON profiles_public TO anon;

-- Admin kontrolü: politikada profiles tablosuna tekrar sorgu atılmasın (sonsuz döngüyü önler)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Admin tüm profilleri okuyabilsin (onay/kullanıcı yönetimi için)
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin"
  ON profiles
  FOR SELECT
  USING (public.is_current_user_admin());

-- Liste sayfaları için: telefon hide_phone ise null
CREATE OR REPLACE VIEW profiles_public_with_phone AS
  SELECT id, full_name, avatar_url,
         CASE WHEN hide_phone THEN NULL ELSE phone END AS phone
  FROM profiles;

GRANT SELECT ON profiles_public_with_phone TO authenticated;
GRANT SELECT ON profiles_public_with_phone TO anon;

-- Uzman listesi (profil + public/telefon): provider_profiles + public bilgiler
CREATE OR REPLACE VIEW provider_list_public AS
  SELECT pp.id, pp.bio, pp.service_categories, pp.rating, pp.total_reviews,
         pp.is_online, pp.status, pp.wallet_balance,
         p.full_name, p.avatar_url,
         CASE WHEN p.hide_phone THEN NULL ELSE p.phone END AS phone
  FROM provider_profiles pp
  JOIN profiles p ON p.id = pp.id;

GRANT SELECT ON provider_list_public TO authenticated;
GRANT SELECT ON provider_list_public TO anon;

-- İş/sohbet bağlamında karşı tarafın iletişim bilgisi (hide_phone’a uygun)
CREATE OR REPLACE FUNCTION get_counterpart_contact(p_job_id UUID)
RETURNS TABLE(phone TEXT, full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN p.hide_phone THEN NULL ELSE p.phone END,
    p.full_name
  FROM jobs j
  JOIN profiles p ON p.id = (
    CASE WHEN j.customer_id = auth.uid() THEN j.provider_id ELSE j.customer_id END
  )
  WHERE j.id = p_job_id
    AND (j.customer_id = auth.uid() OR j.provider_id = auth.uid());
$$;

-- Liste sayfaları için: birden fazla işte karşı taraf bilgisi
CREATE OR REPLACE FUNCTION get_job_counterparts(p_job_ids UUID[])
RETURNS TABLE(job_id UUID, phone TEXT, full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    j.id,
    CASE WHEN p.hide_phone THEN NULL ELSE p.phone END,
    p.full_name
  FROM jobs j
  JOIN profiles p ON p.id = (
    CASE WHEN j.customer_id = auth.uid() THEN j.provider_id ELSE j.customer_id END
  )
  WHERE j.id = ANY(p_job_ids)
    AND (j.customer_id = auth.uid() OR j.provider_id = auth.uid());
$$;

-- ------------------------------------------------------------
-- 2. REVIEWS: Sadece ilgili işin müşterisi ekleyebilir; herkes okuyabilir
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_select" ON reviews;
DROP POLICY IF EXISTS "reviews_insert" ON reviews;

CREATE POLICY "reviews_select"
  ON reviews
  FOR SELECT
  USING (true);

CREATE POLICY "reviews_insert"
  ON reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT customer_id FROM jobs WHERE id = job_id)
    AND (SELECT status FROM jobs WHERE id = job_id) = 'completed'
  );

-- İsteğe bağlı: sadece müşteri kendi yorumunu güncelleyebilsin
CREATE POLICY "reviews_update"
  ON reviews
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ------------------------------------------------------------
-- 3. NOTIFICATIONS: Sadece başkasına bildirim oluşturulabilsin (INSERT)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert"
  ON notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id IS NOT NULL
    AND user_id <> auth.uid()
  );

-- ------------------------------------------------------------
-- 4. STORAGE: documents – sadece kendi user_id klasörüne yaz/oku
-- ------------------------------------------------------------
-- Not: Bucket'lar Supabase Dashboard'dan oluşturulmuş olmalı (documents, job-media).

DROP POLICY IF EXISTS "documents_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_read_own" ON storage.objects;

CREATE POLICY "documents_upload_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_read_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 5. STORAGE: job-media – sadece kendi user_id klasörüne yaz/oku
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "job_media_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "job_media_read_own" ON storage.objects;

CREATE POLICY "job_media_upload_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "job_media_read_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- job-media public okuma: iş görselleri herkese açık olabilir (liste/detay için)
-- Eğer bucket public ise ayrıca "public read" politikası ekleyebilirsiniz.
-- Şu an sadece sahibi okuyabilsin; public URL kullanılıyorsa bucket'ı public yapıp
-- aşağıdaki politikayı kullanın (isteğe bağlı):
-- CREATE POLICY "job_media_read_public" ON storage.objects FOR SELECT USING (bucket_id = 'job-media');

CREATE POLICY "job_media_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'job-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
