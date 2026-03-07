-- ============================================================
-- Uzman ilanları (vitrin / gig) – çift yönlü pazar
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  category_slug TEXT DEFAULT 'repair',
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;

-- Politikaları varsa kaldır (migration tekrar çalıştırılabilir)
DROP POLICY IF EXISTS "provider_services_insert" ON provider_services;
DROP POLICY IF EXISTS "provider_services_update" ON provider_services;
DROP POLICY IF EXISTS "provider_services_delete" ON provider_services;
DROP POLICY IF EXISTS "provider_services_select" ON provider_services;

-- Uzman sadece kendi ilanını ekleyebilir / güncelleyebilir
CREATE POLICY "provider_services_insert"
  ON provider_services FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "provider_services_update"
  ON provider_services FOR UPDATE
  USING (auth.uid() = provider_id);

CREATE POLICY "provider_services_delete"
  ON provider_services FOR DELETE
  USING (auth.uid() = provider_id);

-- Herkes aktif ilanları okuyabilir
CREATE POLICY "provider_services_select"
  ON provider_services FOR SELECT
  USING (status = 'active' OR auth.uid() = provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_status ON provider_services(status);
