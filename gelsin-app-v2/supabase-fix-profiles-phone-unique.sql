-- Telefon unique constraint nedeniyle yeni kullanıcı kaydında duplicate key hatası önlemi:
-- Trigger artık auth.users.phone'u profile yazmıyor; telefon sadece choose-role veya profil sayfasında set ediliyor.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r TEXT := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '');
BEGIN
  INSERT INTO profiles (id, phone, role)
  VALUES (
    NEW.id,
    NULL,
    CASE WHEN r IN ('customer', 'provider', 'admin') THEN r ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
