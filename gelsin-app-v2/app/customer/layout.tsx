'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, User } from 'lucide-react'
import { ChatOverlayProvider } from '@/components/ChatOverlay'
import { useNotifications, NotificationBadge } from '@/components/NotificationProvider'
import { OnboardingTour } from '@/components/OnboardingTour'
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

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { unreadNotificationCount } = useNotifications()
  const [tourRole, setTourRole] = useState<'customer' | 'provider' | null>(null)
  const [profile, setProfile] = useState<{ full_name: string; avatar_url?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const delays = [0, 300, 600, 1000]

    const ensureAuthenticated = async (attempt = 0) => {
      const { getCurrentUserAndRoleWithRefresh } = await import('@/lib/auth')
      let { user, role } = await getCurrentUserAndRoleWithRefresh()

      if (cancelled) return
      if (!user) {
        if (attempt < delays.length - 1) {
          setTimeout(() => ensureAuthenticated(attempt + 1), delays[attempt + 1])
          return
        }
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

      if (role === 'customer') {
        setTourRole('customer')
        const supabase = createClient()
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
        if (!cancelled && data) setProfile({ full_name: data.full_name || '', avatar_url: data.avatar_url })
      }
    }

    ensureAuthenticated(0)
    return () => { cancelled = true }
  }, [router])

  return (
    <ChatOverlayProvider>
      <OnboardingTour role={tourRole} />
      <div className="min-h-dvh bg-[#F8FAFC] font-sans">
        {/* Üst Menü – glass nav (şablondan) */}
        <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/customer" className="text-2xl font-black tracking-tighter text-slate-900">
                GELSİN<span className="text-blue-600">.</span>
              </Link>
              <div className="hidden md:flex gap-8 font-medium text-sm text-slate-500">
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
            <div className="flex items-center gap-4">
              <Link
                href="/customer/notifications"
                className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 transition shadow-sm"
                aria-label="Bildirimler"
              >
                <Bell className="w-5 h-5" />
                <NotificationBadge count={unreadNotificationCount} />
              </Link>
              <Link
                href="/customer/profile"
                className="flex items-center gap-3 bg-white border border-slate-200 py-1.5 pl-1.5 pr-4 rounded-full shadow-sm cursor-pointer hover:shadow-md transition"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    {profile?.full_name ? getInitials(profile.full_name) : <User className="w-4 h-4" />}
                  </div>
                )}
                <span className="font-semibold text-sm text-slate-700">
                  {profile?.full_name
                    ? (() => {
                        const parts = profile.full_name.trim().split(/\s+/)
                        return parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '')
                      })()
                    : 'Profil'}
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <main className="pt-20 min-w-0">
          {children}
        </main>
      </div>
    </ChatOverlayProvider>
  )
}
