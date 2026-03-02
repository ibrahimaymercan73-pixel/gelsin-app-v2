'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomTabBar from '@/components/BottomTabBar'

const tabs = [
  { href: '/admin', icon: '📊', label: 'Özet' },
  { href: '/admin/approvals', icon: '✅', label: 'Onay' },
  { href: '/admin/live', icon: '🗺️', label: 'Canlı' },
  { href: '/admin/finance', icon: '💰', label: 'Finans' },
  { href: '/admin/users', icon: '👥', label: 'Kullanıcı' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/onboarding'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (data?.role !== 'admin') router.replace('/customer')
    }
    check()
  }, [router])
  return (
    <div className="max-w-7xl mx-auto min-h-dvh bg-gray-50">
      <div className="pb-24">{children}</div>
      <BottomTabBar tabs={tabs} />
    </div>
  )
}
