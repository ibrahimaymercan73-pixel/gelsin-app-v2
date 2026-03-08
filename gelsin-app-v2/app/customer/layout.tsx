import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CustomerLayoutClient } from './CustomerLayoutClient'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', session.user.id)
    .single()

  const role = (profileRow?.role as 'customer' | 'provider' | 'admin' | null) ?? null

  if (!role) {
    redirect('/choose-role')
  }
  if (role === 'provider') {
    redirect('/provider')
  }
  if (role === 'admin') {
    redirect('/admin')
  }

  const initialProfile = profileRow
    ? { full_name: profileRow.full_name || '', avatar_url: profileRow.avatar_url }
    : null

  return (
    <CustomerLayoutClient initialProfile={initialProfile}>
      {children}
    </CustomerLayoutClient>
  )
}
