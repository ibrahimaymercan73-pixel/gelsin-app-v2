-- PayTR Pazaryeri Ödemeleri – payments tablosu
-- Bu script'i Supabase SQL Editor'da ÇALIŞTIRIN.

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  offer_id UUID REFERENCES offers(id) NOT NULL,
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  provider_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  provider_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','in_escrow','released','refunded','failed')),
  paytr_merchant_oid TEXT UNIQUE NOT NULL,
  paytr_token TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  released_at TIMESTAMPTZ
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_own" ON public.payments FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "provider_own" ON public.payments FOR SELECT USING (provider_id = auth.uid());
CREATE POLICY "service_role_all" ON public.payments USING (auth.role() = 'service_role');

