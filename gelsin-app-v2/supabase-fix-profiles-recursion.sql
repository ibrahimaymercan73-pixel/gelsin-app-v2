-- ============================================================
-- "infinite recursion detected in policy for relation profiles" düzeltmesi
-- Supabase SQL Editor'da bu dosyayı çalıştırın (bir kez).
-- ============================================================

-- Eski politikayı kaldır (içinde profiles'a sorgu atıyordu → döngü)
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

-- Admin mi kontrolü: SECURITY DEFINER ile RLS tetiklenmeden okur
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Admin tüm profilleri okuyabilsin (artık döngü yok)
CREATE POLICY "profiles_select_admin"
  ON profiles
  FOR SELECT
  USING (public.is_current_user_admin());
