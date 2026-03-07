# Pazarlık sütunu hatası – Çözüm

Hata: `Could not find the 'is_bargain_requested' column of 'offers' in the schema cache`

**Yapmanız gereken:** Supabase Dashboard’da bu SQL’i çalıştırın.

1. [Supabase Dashboard](https://supabase.com/dashboard) → Projeniz → **SQL Editor**
2. Yeni sorgu açın, aşağıdakini yapıştırıp **Run** deyin:

```sql
-- Teklif tablosuna pazarlık talebi bayrağı
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS is_bargain_requested BOOLEAN DEFAULT false;

-- Uzman kendi teklifini güncelleyebilsin
DROP POLICY IF EXISTS "offers_update" ON offers;
CREATE POLICY "offers_update" ON offers FOR UPDATE USING (
  auth.uid() = provider_id
  OR auth.uid() = (SELECT customer_id FROM jobs WHERE id = job_id)
);
```

3. Başarılı olduktan sonra sayfayı yenileyip "🤝 Pazarlık Yap"ı tekrar deneyin. Schema cache kısa süre içinde güncellenir.
