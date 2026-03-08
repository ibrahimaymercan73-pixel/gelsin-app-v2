import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ProviderLayoutClient } from './ProviderLayoutClient'

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/onboarding')
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .single()

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

  const initialProviderName = profileRow?.full_name?.trim() ?? ''

  return (
    <ProviderLayoutClient initialProviderName={initialProviderName}>
      {children}
    </ProviderLayoutClient>
  )
}
