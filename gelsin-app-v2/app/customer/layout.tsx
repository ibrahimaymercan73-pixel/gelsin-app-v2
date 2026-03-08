'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, MessageCircle, User } from 'lucide-react'
import { ChatOverlayProvider } from '@/components/ChatOverlay'
import { useNotifications, NotificationBadge } from '@/components/NotificationProvider'
import { OnboardingTour } from '@/components/OnboardingTour'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'

const TOP_NAV_ITEMS = [
  { href: '/customer', label: 'Keşfet' },
  { href: '/customer/jobs', label: 'İşlerim' },
  { href: '/customer/messages', label: 'Mesajlar' },
]

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function CustomerNavSkeleton() {
  return (
    <nav className="flex-shrink-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
        <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </div>
    </nav>
  )
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, role, loading: authLoading } = useAuth()
  const { unreadNotificationCount } = useNotifications()
  const [tourRole, setTourRole] = useState<'customer' | 'provider' | null>(null)
  const [profile, setProfile] = useState<{ full_name: string; avatar_url?: string } | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!user || role !== 'customer') return
    setTourRole('customer')
    let cancelled = false
    const supabase = createClient()
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single().then(({ data }) => {
      if (!cancelled && data) setProfile({ full_name: data.full_name || '', avatar_url: data.avatar_url })
      if (!cancelled) setProfileLoaded(true)
    })
    return () => { cancelled = true }
  }, [user?.id, role])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!role) {
      router.replace('/choose-role')
      return
    }
    if (role === 'provider') {
      router.replace('/provider')
      return
    }
    if (role === 'admin') {
      router.replace('/admin')
      return
    }
  }, [authLoading, user, role, router])

  if (authLoading) {
    return (
      <div className="h-dvh max-h-dvh flex flex-col bg-[#F8FAFC] font-sans overflow-hidden">
        <CustomerNavSkeleton />
        <main className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="h-12 w-3/4 max-w-md bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-52 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!user || role !== 'customer') {
    return null
  }

  return (
    <ChatOverlayProvider>
      <OnboardingTour role={tourRole} />
      <div className="h-dvh max-h-dvh flex flex-col bg-[#F8FAFC] font-sans overflow-hidden">
        <nav className="flex-shrink-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
            <div className="flex items-center gap-6 md:gap-8 min-w-0 flex-1">
              <Link href="/customer" className="text-2xl font-black tracking-tighter text-slate-900 shrink-0">
                GELSİN<span className="text-blue-600">.</span>
              </Link>
              <div className="hidden md:flex gap-6 font-medium text-sm text-slate-500">
                {TOP_NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`hover:text-slate-900 transition pb-1 ${
                        isActive ? 'text-slate-900 font-bold border-b-2 border-slate-900 pb-1' : ''
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <Link
                href="/customer/notifications"
                className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 transition shadow-sm"
                aria-label="Bildirimler"
              >
                <Bell className="w-5 h-5" />
                <NotificationBadge count={unreadNotificationCount} />
              </Link>
              <Link
                href="/customer/messages"
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 transition shadow-sm"
                aria-label="Mesajlar"
                title="Mesajlar"
              >
                <MessageCircle className="w-5 h-5" />
              </Link>
              <Link
                href="/customer/profile"
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm hover:shadow-md transition overflow-hidden min-w-[2.5rem] min-h-[2.5rem]"
                aria-label="Profil"
                title={profile?.full_name || 'Profil'}
              >
                {!profileLoaded ? (
                  <div className="w-full h-full rounded-full bg-slate-200 animate-pulse" />
                ) : profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : profile?.full_name ? (
                  <span className="text-xs font-bold text-slate-900">{getInitials(profile.full_name)}</span>
                ) : (
                  <User className="w-5 h-5 text-slate-600" />
                )}
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </ChatOverlayProvider>
  )
}
