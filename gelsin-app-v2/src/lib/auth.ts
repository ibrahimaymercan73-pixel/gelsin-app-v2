import { createClient, UserRole } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthContext {
  user: User | null
  role: UserRole | null
}

export async function getCurrentUserAndRole(): Promise<AuthContext> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, role: null }
  }

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    user,
    role: (data?.role as UserRole | null) ?? null,
  }
}

/** Oturum süresi dolmuş olabilir; önce yenile, sonra kullanıcı/rol al (layout için) */
export async function getCurrentUserAndRoleWithRefresh(): Promise<AuthContext> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    await supabase.auth.refreshSession()
  }
  return getCurrentUserAndRole()
}

export async function getProviderStatus(userId: string): Promise<'pending' | 'approved' | 'suspended' | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('provider_profiles')
    .select('status')
    .eq('id', userId)
    .single()

  return (data?.status as 'pending' | 'approved' | 'suspended' | null) ?? null
}

