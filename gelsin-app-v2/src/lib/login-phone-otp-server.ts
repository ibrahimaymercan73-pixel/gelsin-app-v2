import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { phoneVariantsForDb } from '@/lib/phone-tr'

export type IntendedRole = 'customer' | 'provider'

export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function findProfileByPhoneAndRole(
  supabase: SupabaseClient,
  phoneE164: string,
  intendedRole: IntendedRole
): Promise<
  | { ok: true; profile: { id: string; role: string | null; phone: string | null } }
  | { ok: false; reason: 'not_found' | 'wrong_role' }
> {
  const variants = phoneVariantsForDb(phoneE164)
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, role, phone')
    .in('phone', variants)

  if (error || !rows?.length) {
    return { ok: false, reason: 'not_found' }
  }

  const match = rows.find((r) => r.role === intendedRole)
  if (match) {
    return { ok: true, profile: match }
  }

  return { ok: false, reason: 'wrong_role' }
}
