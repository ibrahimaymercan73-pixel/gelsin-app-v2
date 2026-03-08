-- ============================================================
-- notifications INSERT policy sıkılaştırma
-- Sadece kendi işi (job) ile ilişkili bildirimler veya admin ekleyebilir.
-- Service role kullanan API/RPC zaten RLS bypass eder.
-- Supabase Dashboard > SQL Editor'da çalıştırın.
-- ============================================================

DROP POLICY IF EXISTS "notifications_insert" ON notifications;

CREATE POLICY "notifications_insert"
  ON notifications
  FOR INSERT
  WITH CHECK (
    user_id IS NOT NULL
    AND user_id <> auth.uid()
    AND (
      (related_job_id IS NOT NULL AND (
        auth.uid() = (SELECT customer_id FROM jobs WHERE id = related_job_id)
        OR auth.uid() = (SELECT provider_id FROM jobs WHERE id = related_job_id)
      ))
      OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
  );
