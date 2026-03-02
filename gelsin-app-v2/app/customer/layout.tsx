'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomTabBar from '@/components/BottomTabBar'

const tabs = [
  { href: '/customer', icon: '🏠', label: 'Ana Sayfa' },
  { href: '/customer/new-job', icon: '➕', label: 'Yeni İş' },
  { href: '/customer/jobs', icon: '📋', label: 'İşlerim' },
  { href: '/customer/profile', icon: '👤', label: 'Profil' },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/onboarding')
    })
  }, [router])
  return (
    <div className="max-w-md mx-auto min-h-dvh bg-gray-50">
      <div className="pb-24">{children}</div>
      <BottomTabBar tabs={tabs} />
    </div>
  )
}
