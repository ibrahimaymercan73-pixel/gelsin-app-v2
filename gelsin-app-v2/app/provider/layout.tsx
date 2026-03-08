'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { ChatOverlayProvider } from '@/components/ChatOverlay'
import { useNotifications, NotificationBadge } from '@/components/NotificationProvider'
import { useUpdatePresence } from '@/hooks/useUpdatePresence'
import { OnboardingTour } from '@/components/OnboardingTour'

const navItems = [
  { href: '/provider', icon: '🏠', label: 'Özet', showBadge: false, tourId: null as string | null },
  { href: '/provider/jobs', icon: '🔍', label: 'Radar', showBadge: false, tourId: 'tour-radar' as string | null },
  { href: '/provider/my-jobs', icon: '💼', label: 'İşlerim', showBadge: false, tourId: null },
  { href: '/provider/notifications', icon: '💬', label: 'Mesajlar', showBadge: true, tourId: null },
  { href: '/provider/profile', icon: '👤', label: 'Profil', showBadge: false, tourId: null },
]

function ProviderShellSkeleton() {
  return (
    <div className="min-h-dvh bg-[#F4F7FA] flex font-sans">
      <main className="flex-1 pb-24 md:pb-0">
        <div className="px-6 lg:px-10 py-6 flex items-center justify-between border-b border-slate-200/50">
          <div>
            <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-7 w-32 mt-2 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-slate-200 rounded-full animate-pulse" />
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, role, loading: authLoading } = useAuth()
  const { unreadMessageCount, unreadNotificationCount } = useNotifications()
  const unreadCount = unreadMessageCount + unreadNotificationCount
  const [tourRole, setTourRole] = useState<'customer' | 'provider' | null>(null)
  useUpdatePresence()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/onboarding')
      return
    }
    if (role === 'customer') {
      router.replace('/customer')
      return
    }
    if (role === 'admin') {
      router.replace('/admin')
      return
    }
    if (role === 'provider') setTourRole('provider')
  }, [authLoading, user, role, router])

  const hideBottomNav = pathname.startsWith('/provider/chat')

  if (authLoading) {
    return <ProviderShellSkeleton />
  }

  if (!user || role !== 'provider') {
    return null
  }

  return (
    <ChatOverlayProvider>
      <OnboardingTour role={tourRole} />
      <div className="min-h-dvh bg-[#F4F7FA] flex font-sans">
      <aside className="hidden lg:flex w-64 bg-slate-900 flex-col fixed h-full z-50">
        <div className="px-8 py-7 border-b border-white/5">
          <span className="text-xl font-black text-white italic tracking-tighter">
            GELSİN<span className="text-blue-500">.</span>
          </span>
          <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-widest">Uzman Paneli</p>
        </div>
        <nav className="p-4 space-y-1 mt-2 flex-1">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                {...(item.tourId ? { id: item.tourId } : {})}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
                  isActive ? 'bg-blue-600/15 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}>
                <span className="text-lg relative">
                  {item.icon}
                  {item.showBadge && <NotificationBadge count={unreadCount} />}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="px-4 py-3 rounded-2xl bg-blue-600/10 text-center">
            <p className="text-xs text-blue-400 font-bold">Uzman Hesabı</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 pb-24 md:pb-0">
        {children}
      </main>

      {!hideBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg px-1 py-2 flex justify-between items-center z-[100] rounded-t-3xl shadow-2xl border-t border-white/10 pb-[env(safe-area-inset-bottom,8px)]">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                {...(item.tourId ? { id: item.tourId } : {})}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 rounded-xl transition-all ${
                  isActive ? 'text-blue-400' : 'text-slate-500'
                }`}>
                <span className="text-lg sm:text-xl relative flex-shrink-0">
                  {item.icon}
                  {item.showBadge && <NotificationBadge count={unreadCount} />}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold truncate max-w-full">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
      </div>
    </ChatOverlayProvider>
  )
}
