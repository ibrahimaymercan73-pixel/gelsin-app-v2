-- SMS ile giriş OTP kayıtları (sadece service role / sunucu route'larından erişilir)
CREATE TABLE IF NOT EXISTS public.login_phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL,
  intended_role TEXT NOT NULL CHECK (intended_role IN ('customer', 'provider')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_phone_otps_lookup
  ON public.login_phone_otps (phone_e164, intended_role, expires_at DESC)
  WHERE consumed_at IS NULL;

ALTER TABLE public.login_phone_otps ENABLE ROW LEVEL SECURITY;

-- Anon / authenticated okuyamaz (service role RLS'yi bypass eder)
CREATE POLICY "login_phone_otps_deny_select"
  ON public.login_phone_otps
  FOR SELECT
  USING (false);

COMMENT ON TABLE public.login_phone_otps IS 'SMS OTP (İleti Merkezi); 2 dk geçerlilik, yalnızca sunucu API (service role).';
