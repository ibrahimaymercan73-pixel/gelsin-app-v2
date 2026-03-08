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
    .select('id, role, full_name, avatar_url, phone, city, hide_phone')
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
    ? {
        id: profileRow.id,
        full_name: profileRow.full_name || '',
        avatar_url: profileRow.avatar_url ?? undefined,
        phone: profileRow.phone || '',
        city: profileRow.city || '',
        hide_phone: !!profileRow.hide_phone,
      }
    : null
  const initialEmail = session.user.email ?? null

  return (
    <CustomerLayoutClient initialProfile={initialProfile} initialEmail={initialEmail}>
      {children}
    </CustomerLayoutClient>
  )
}
