'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomTabBar from '@/components/BottomTabBar'

const tabs = [
  { href: '/provider', icon: '📊', label: 'Özet' },
  { href: '/provider/jobs', icon: '🔍', label: 'Radar' },
  { href: '/provider/my-jobs', icon: '🔨', label: 'İşlerim' },
  { href: '/provider/wallet', icon: '💰', label: 'Cüzdan' },
  { href: '/provider/profile', icon: '👤', label: 'Profil' },
]

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/onboarding'); return }
      const { data } = await supabase.from('provider_profiles').select('status').eq('id', user.id).single()
      setPending(data?.status === 'pending')
    }
    check()
  }, [router])
  return (
    <div className="max-w-md mx-auto min-h-dvh bg-gray-50">
      {pending && (
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-2.5 px-4">
          ⏳ Hesabınız onay bekliyor — Profil'den belgelerinizi yükleyin
        </div>
      )}
      <div className="pb-24">{children}</div>
      <BottomTabBar tabs={tabs} />
    </div>
  )
}
