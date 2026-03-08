'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, MessageSquare, Briefcase, ClipboardList, Bell, Search, User } from 'lucide-react'
import { ChatOverlayProvider } from '@/components/ChatOverlay'
import { useNotifications, NotificationBadge } from '@/components/NotificationProvider'
import { OnboardingTour } from '@/components/OnboardingTour'
import { createClient } from '@/lib/supabase'

const TOP_NAV_ITEMS = [
  { href: '/customer', label: 'Ana Sayfa' },
  { href: '/customer/jobs', label: 'İşlerim' },
  { href: '/customer/messages', label: 'Mesajlar' },
  { href: '/customer/panel', label: 'Panel' },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { unreadMessageCount, unreadNotificationCount } = useNotifications()
  const [tourRole, setTourRole] = useState<'customer' | 'provider' | null>(null)
  const [profile, setProfile] = useState<{ full_name: string; avatar_url?: string } | null>(null)
  const [headerSearch, setHeaderSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    const delays = [0, 300, 600, 1000]

    const ensureAuthenticated = async (attempt = 0) => {
      const { getCurrentUserAndRoleWithRefresh } = await import('@/lib/auth')
      let { user, role } = await getCurrentUserAndRoleWithRefresh()

      if (cancelled) return
      if (!user) {
        if (attempt < delays.length - 1) {
          const delay = delays[attempt + 1]
          setTimeout(() => ensureAuthenticated(attempt + 1), delay)
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

  const handleHeaderSearch = () => {
    const q = headerSearch.trim()
    if (q) router.push(`/customer/providers?q=${encodeURIComponent(q)}`)
    else router.push('/customer/providers')
  }

  return (
    <ChatOverlayProvider>
      <OnboardingTour role={tourRole} />
      <div className="min-h-dvh bg-slate-50 font-sans flex flex-col">
        {/* Üst Menü (Top Navigation) – sticky, bembeyaz */}
        <header className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              {/* Sol: Logo */}
              <Link href="/customer" className="flex items-center shrink-0">
                <span className="text-xl font-black text-slate-800 tracking-tight">
                  GELSİN<span className="text-slate-500">.</span>
                </span>
              </Link>

              {/* Orta: Navigasyon linkleri (masaüstü) */}
              <nav className="hidden md:flex items-center gap-1">
                {TOP_NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              {/* Sağ: Arama, Bildirim, Profil */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Kompakt arama */}
                <div className="hidden sm:flex items-center max-w-[180px] lg:max-w-[220px]">
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Uzman ara..."
                      value={headerSearch}
                      onChange={(e) => setHeaderSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleHeaderSearch()}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
                    />
                  </div>
                </div>

                {/* Bildirim */}
                <Link
                  href="/customer/notifications"
                  className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Bildirimler"
                >
                  <Bell className="w-5 h-5" />
                  <NotificationBadge count={unreadNotificationCount} />
                </Link>

                {/* Profil avatarı – tıklanınca menü veya profil sayfası */}
                <Link
                  href="/customer/profile"
                  className="flex items-center gap-2 p-1.5 pr-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                  <span className="hidden lg:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {profile?.full_name || 'Profil'}
                  </span>
                </Link>
              </div>
            </div>

            {/* Mobil: alt satırda nav linkleri (kaydırılabilir) */}
            <nav className="md:hidden flex items-center gap-1 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4">
              {TOP_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </header>

        {/* Ana içerik – padding altında bottom nav yok */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </ChatOverlayProvider>
  )
}
