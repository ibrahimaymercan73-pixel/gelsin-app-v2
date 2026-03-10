-- ============================================================
-- release_payment RPC güvenlik düzeltmesi (yetki + tek kullanım)
-- Sadece işin ustası (provider) veya admin bu RPC'yi çağırabilir.
-- Ödeme zaten serbest bırakıldıysa tekrar çalışmaz; qr_used_at set edilir.
-- Önce supabase-migration-qr-used-at.sql çalıştırın (qr_used_at kolonu).
-- Supabase Dashboard > SQL Editor'da çalıştırın.
-- ============================================================

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

  IF v_job.payment_released THEN
    RAISE EXCEPTION 'Ödeme zaten serbest bırakıldı';
  END IF;

  v_commission := v_job.agreed_price * 0.02;
  v_provider_amount := v_job.agreed_price - v_commission;

  UPDATE jobs SET
    status = 'completed',
    platform_fee = v_commission,
    provider_amount = v_provider_amount,
    payment_released = true,
    qr_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;

  UPDATE provider_profiles
  SET wallet_balance = wallet_balance + v_provider_amount
  WHERE id = v_job.provider_id;

  INSERT INTO transactions (job_id, type, amount, from_id, to_id, notes) VALUES
    (p_job_id, 'commission', v_commission, v_job.customer_id, NULL, 'Platform komisyonu %2'),
    (p_job_id, 'provider_payout', v_provider_amount, NULL, v_job.provider_id, 'Usta ödemesi');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
