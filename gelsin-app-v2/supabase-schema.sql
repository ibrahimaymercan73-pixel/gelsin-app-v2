-- ============================================================
-- GELSIN.APP - Supabase Veritabanı Şeması
-- Supabase SQL Editor'e kopyalayıp çalıştırın
-- ============================================================

-- Kullanıcı profilleri (auth.users'ı genişletir)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT NULL CHECK (role IS NULL OR role IN ('customer', 'provider', 'admin')),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  hide_phone BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hizmet veren (usta) profilleri
CREATE TABLE provider_profiles (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  bio TEXT,
  service_categories TEXT[] DEFAULT '{}',  -- ['repair', 'cleaning', 'carpet']
  is_onboarded BOOLEAN DEFAULT false,
  rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  wallet_balance NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ,
  avg_response_time_mins INT DEFAULT 15,
  id_document_url TEXT,       -- e-Devlet kimlik belgesi
  criminal_record_url TEXT,   -- Adli sicil belgesi
  documents_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hizmet kategorileri
CREATE TABLE service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,  -- 'repair', 'cleaning', 'carpet'
  name TEXT NOT NULL,         -- 'Acil Tamir', 'Randevulu Temizlik', 'Halı Yıkama'
  icon TEXT,
  description TEXT,
  base_price NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true
);

-- Hizmet talepleri (işler)
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  provider_id UUID REFERENCES profiles(id),
  category_id UUID REFERENCES service_categories(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
status TEXT DEFAULT 'open' CHECK (status IN (
  'open', 'offered', 'accepted', 'started', 'completed', 'cancelled', 'disputed'
)),
  job_type TEXT CHECK (job_type IN ('urgent', 'scheduled', 'process')),
  scheduled_at TIMESTAMPTZ,
  agreed_price NUMERIC(10,2),
  platform_fee NUMERIC(10,2),
  provider_amount NUMERIC(10,2),
  qr_token TEXT UNIQUE,  -- Dinamik QR için token
  qr_scanned_at TIMESTAMPTZ,
  escrow_held BOOLEAN DEFAULT false,
  payment_released BOOLEAN DEFAULT false,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teklifler (usta -> iş teklifi)
CREATE TABLE offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES profiles(id) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  estimated_duration TEXT,  -- '2 saat', '1 gün'
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, provider_id)
);

-- Yorumlar & Puanlar
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  provider_id UUID REFERENCES profiles(id) NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow işlemleri
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) NOT NULL,
  type TEXT CHECK (type IN ('escrow_hold', 'commission', 'provider_payout', 'refund')),
  amount NUMERIC(10,2) NOT NULL,
  from_id UUID REFERENCES profiles(id),
  to_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bildirimler
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,  -- 'new_offer', 'job_started', 'job_completed', etc.
  related_job_id UUID REFERENCES jobs(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesajlar (müşteri <-> usta, iş bazlı sohbet)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  receiver_id UUID REFERENCES profiles(id) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA: Hizmet kategorileri
-- ============================================================
INSERT INTO service_categories (slug, name, icon, description, base_price) VALUES
  ('repair', 'Acil Tamir', '🔧', 'Su tesisatı, elektrik, mobilya ve her türlü acil tamir hizmeti', 150),
  ('cleaning', 'Randevulu Temizlik', '🧹', 'Ev, ofis ve işyeri temizlik hizmetleri', 200),
  ('carpet', 'Halı Yıkama', '🏠', 'Halı, kilim ve koltuk yıkama hizmetleri', 100);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) Politikaları
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Herkes kendi profilini okuyabilir ve düzenleyebilir
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Provider profiles: Herkese açık okuma, sadece kendi kaydını değiştirebilir
CREATE POLICY "provider_profiles_select" ON provider_profiles FOR SELECT USING (true);
CREATE POLICY "provider_profiles_update" ON provider_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "provider_profiles_insert" ON provider_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Jobs: Müşteri kendi işlerini, usta da kabul ettiği işleri görebilir; adminler tüm işleri görebilir
CREATE POLICY "jobs_select" ON jobs FOR SELECT USING (
  auth.uid() = customer_id OR
  auth.uid() = provider_id OR
  status = 'open' OR
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "jobs_update" ON jobs FOR UPDATE USING (
  auth.uid() = customer_id OR auth.uid() = provider_id
);

-- Offers: Usta kendi tekliflerini, müşteri kendi işine gelen teklifleri görebilir
CREATE POLICY "offers_select" ON offers FOR SELECT USING (
  auth.uid() = provider_id OR
  auth.uid() = (SELECT customer_id FROM jobs WHERE id = job_id)
);
CREATE POLICY "offers_insert" ON offers FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "offers_update" ON offers FOR UPDATE USING (
  auth.uid() = (SELECT customer_id FROM jobs WHERE id = job_id)
);

-- Notifications: Sadece kendi bildirimleri
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Messages: ilgili taraflar VE adminler görebilir, sadece gönderen ekleyebilir
CREATE POLICY "messages_select" ON messages
FOR SELECT USING (
  auth.uid() = sender_id OR
  auth.uid() = receiver_id OR
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

CREATE POLICY "messages_insert" ON messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Transactions: Sadece ilgili taraflar
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (
  auth.uid() = from_id OR auth.uid() = to_id
);

-- ============================================================
-- FONKSIYONLAR
-- ============================================================

-- Yeni auth kullanıcısı için otomatik profil oluştur (role=NULL → kullanıcı /role-selection'a düşer)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r TEXT := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '');
BEGIN
  INSERT INTO profiles (id, phone, role)
  VALUES (
    NEW.id,
    NEW.phone,
    CASE WHEN r IN ('customer', 'provider', 'admin') THEN r ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Usta konumunu güncelle
CREATE OR REPLACE FUNCTION update_provider_location(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS void AS $$
BEGIN
  UPDATE provider_profiles
  SET current_lat = p_lat, current_lng = p_lng, updated_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Platform komisyonunu hesapla ve öde (%2 komisyon)
CREATE OR REPLACE FUNCTION release_payment(p_job_id UUID)
RETURNS void AS $$
DECLARE
  v_job jobs%ROWTYPE;
  v_commission NUMERIC;
  v_provider_amount NUMERIC;
BEGIN
  IF (SELECT id FROM public.jobs WHERE id = p_job_id AND provider_id = auth.uid()) IS NULL
     AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin'
  THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
  
  v_commission := v_job.agreed_price * 0.02;
  v_provider_amount := v_job.agreed_price - v_commission;
  
  -- İşi güncelle
  UPDATE jobs SET
    status = 'completed',
    platform_fee = v_commission,
    provider_amount = v_provider_amount,
    payment_released = true,
    updated_at = NOW()
  WHERE id = p_job_id;
  
  -- Ustanın cüzdanını güncelle
  UPDATE provider_profiles
  SET wallet_balance = wallet_balance + v_provider_amount
  WHERE id = v_job.provider_id;
  
  -- İşlem kayıtları
  INSERT INTO transactions (job_id, type, amount, from_id, to_id, notes) VALUES
    (p_job_id, 'commission', v_commission, v_job.customer_id, NULL, 'Platform komisyonu %2'),
    (p_job_id, 'provider_payout', v_provider_amount, NULL, v_job.provider_id, 'Usta ödemesi');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket oluştur (belge yüklemeleri için)
-- Supabase Dashboard > Storage > New Bucket: "documents" (private)
-- Supabase Dashboard > Storage > New Bucket: "avatars" (public)

-- ============================================================
-- REALTIME için tablolar etkinleştir
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_profiles;

-- ============================================================
-- GÜNCELLEMEler: Çift QR sistemi için (v2)
-- ============================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS end_qr_token TEXT UNIQUE;

-- Profilde telefon gizlilik ayarı (uzman teklif ekranında görünsün)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_phone BOOLEAN DEFAULT false;

-- Usta çevrimiçi / son görülme ve ortalama yanıt süresi
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS avg_response_time_mins INT DEFAULT 15;
