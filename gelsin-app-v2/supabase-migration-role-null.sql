-- ============================================================
-- MİGRASYON: Yeni Google/Email kullanıcıları rol seçimine düşsün
-- Supabase SQL Editor'da bir kez çalıştırın.
-- Böylece farklı hesapla "Usta" seçen kullanıcı gerçekten usta olur.
-- ============================================================

-- 1) profiles.role artık NULL olabilir (yeni kullanıcılar rol seçimine gidecek)
ALTER TABLE public.profiles
  ALTER COLUMN role DROP NOT NULL,
  ALTER COLUMN role SET DEFAULT NULL;

-- 2) Eski CHECK kaldır, NULL + customer/provider/admin kabul eden yeni CHECK ekle
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR role IN ('customer', 'provider', 'admin'));

-- 3) Yeni kayıtlarda role NULL atansın (sadece meta'da açıkça yazıyorsa rol kullan)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r TEXT := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '');
BEGIN
  INSERT INTO public.profiles (id, phone, role)
  VALUES (
    NEW.id,
    NEW.phone,
    CASE WHEN r IN ('customer', 'provider', 'admin') THEN r ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
