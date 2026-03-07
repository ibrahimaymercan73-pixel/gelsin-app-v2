-- ============================================================
-- Cüzdan: IBAN alanları + Para çekme talepleri (withdrawals)
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- provider_profiles'a banka bilgileri
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

-- Para çekme talepleri tablosu
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  iban TEXT NOT NULL,
  bank_name TEXT,
  account_holder_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals_select_own"
  ON withdrawals FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "withdrawals_insert_own"
  ON withdrawals FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

-- Admin tüm talepleri görebilsin (opsiyonel)
DROP POLICY IF EXISTS "withdrawals_select_admin" ON withdrawals;
CREATE POLICY "withdrawals_select_admin"
  ON withdrawals FOR SELECT
  USING (public.is_current_user_admin());
