import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ProviderLayoutClient } from './ProviderLayoutClient'

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/onboarding')
  }

  const [{ data: profileRow }, { data: providerRow }] = await Promise.all([
    supabase.from('profiles').select('id, role, full_name, phone, city, hide_phone, face_verified, avatar_url').eq('id', session.user.id).single(),
    supabase.from('provider_profiles').select('*').eq('id', session.user.id).single(),
  ])

  const role = (profileRow?.role as 'customer' | 'provider' | 'admin' | null) ?? null

  if (!role) {
    redirect('/choose-role')
  }
  if (role === 'customer') {
    redirect('/customer')
  }
  if (role === 'admin') {
    redirect('/admin')
  }

  const initialProfile = profileRow
    ? {
        id: profileRow.id,
        full_name: profileRow.full_name || '',
        phone: profileRow.phone || '',
        city: profileRow.city || '',
        hide_phone: !!profileRow.hide_phone,
        face_verified: !!profileRow.face_verified,
        avatar_url: profileRow.avatar_url ?? null,
      }
    : null
  const initialProviderProfile = providerRow ?? null
  const initialEmail = session.user.email ?? null

  return (
    <ProviderLayoutClient
      initialProviderName={profileRow?.full_name?.trim() ?? ''}
      initialProfile={initialProfile}
      initialProviderProfile={initialProviderProfile}
      initialEmail={initialEmail}
    >
      {children}
    </ProviderLayoutClient>
  )
}
