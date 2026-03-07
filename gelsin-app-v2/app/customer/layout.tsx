'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, MessageSquare, Briefcase, Menu, ClipboardList, Bell, User, Plus } from 'lucide-react'
import { ChatOverlayProvider } from '@/components/ChatOverlay'
import { useNotifications, NotificationBadge } from '@/components/NotificationProvider'
import { OnboardingTour } from '@/components/OnboardingTour'

/** Mobil bottom nav: 4’lü koyu menü (Bionluk tarzı) */
const mobileNavItems = [
  { href: '/customer', icon: Home, label: 'Keşfet', badgeType: null as 'message' | 'notification' | null, tourId: 'tour-ana-sayfa' as const },
  { href: '/customer/messages', icon: MessageSquare, label: 'Mesajlar', badgeType: 'message' as const, tourId: 'tour-mesajlar' as const },
  { href: '/customer/panel', icon: Briefcase, label: 'Panel', badgeType: null, tourId: null },
  { href: '/customer/menu', icon: Menu, label: 'Diğer', badgeType: 'notification' as const, tourId: null },
]

/** Masaüstü sidebar: geniş menü – badgeType ile rozet: message=Mesajlar, notification=Bildirimler */
const desktopNavItems = [
  { href: '/customer', icon: Home, label: 'Ana Sayfa', badgeType: null as 'message' | 'notification' | null, tourId: 'tour-ana-sayfa' as const },
  { href: '/customer/jobs', icon: ClipboardList, label: 'İşlerim', badgeType: null, tourId: 'tour-jobs' as const },
  { href: '/customer/messages', icon: MessageSquare, label: 'Mesajlar', badgeType: 'message' as const, tourId: 'tour-mesajlar' as const },
  { href: '/customer/notifications', icon: Bell, label: 'Bildirimler', badgeType: 'notification' as const, tourId: null },
  { href: '/customer/panel', icon: Briefcase, label: 'Panel', badgeType: null, tourId: null },
  { href: '/customer/profile', icon: User, label: 'Profilim', badgeType: null, tourId: null },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { unreadMessageCount, unreadNotificationCount } = useNotifications()
  const [tourRole, setTourRole] = useState<'customer' | 'provider' | null>(null)

  useEffect(() => {
    let cancelled = false
    const ensureAuthenticated = async (retry = false) => {
      const { getCurrentUserAndRoleWithRefresh } = await import('@/lib/auth')
      let { user, role } = await getCurrentUserAndRoleWithRefresh()

      if (cancelled) return
      if (!user) {
        if (!retry) {
          setTimeout(() => ensureAuthenticated(true), 400)
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

      if (role === 'customer') setTourRole('customer')
    }

    ensureAuthenticated()
    return () => { cancelled = true }
  }, [router])

  const hideBottomNav = pathname.startsWith('/customer/chat')

  return (
    <ChatOverlayProvider>
      <OnboardingTour role={tourRole} />
      <div className="min-h-dvh bg-[#fafaf9] flex font-sans">

      {/* DESKTOP SIDEBAR - glassmorphism style */}
      <aside className="hidden lg:flex w-64 bg-white/80 backdrop-blur-md flex-col fixed h-full z-50 border-r border-stone-200/80 shadow-lg shadow-stone-200/50">
        <div className="px-6 py-6 border-b border-stone-200/60">
          <span className="text-xl font-black text-stone-900 tracking-tight">
            GELSİN<span className="text-slate-900">.</span>
          </span>
          <p className="text-stone-500 text-xs font-semibold mt-1 uppercase tracking-widest">Müşteri Paneli</p>
        </div>

        <nav className="p-3 space-y-1 mt-2 flex-1">
          {desktopNavItems.map(item => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                {...(item.tourId ? { id: item.tourId } : {})}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                  isActive ? 'bg-slate-900/5 text-slate-900' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}>
                <span className="relative">
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.badgeType === 'message' && <NotificationBadge count={unreadMessageCount} />}
                  {item.badgeType === 'notification' && <NotificationBadge count={unreadNotificationCount} />}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-stone-200/60">
          <Link href="/customer/new-job"
            className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-900/25 active:scale-[0.98]">
            <Plus className="w-5 h-5" /> Yeni İş Talebi
          </Link>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <main className="flex-1 lg:ml-64 pb-24 lg:pb-0">
        {children}
      </main>

      {/* MOBİL BOTTOM NAV – koyu 4’lü (Bionluk tarzı) */}
      {!hideBottomNav && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 px-1 py-2 flex justify-around items-stretch z-[90] border-t border-slate-800 pb-[env(safe-area-inset-bottom,8px)]">
          {mobileNavItems.map(item => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(item.tourId ? { id: item.tourId } : {})}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0 transition-colors active:opacity-80 ${
                  isActive ? 'text-white font-semibold' : 'text-slate-400 font-normal'
                }`}
              >
                <span className="relative">
                  <Icon className="w-6 h-6 shrink-0" />
                  {item.badgeType === 'message' && <NotificationBadge count={unreadMessageCount} />}
                  {item.badgeType === 'notification' && <NotificationBadge count={unreadNotificationCount} />}
                </span>
                <span className="text-[10px] mt-1 truncate w-full text-center">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* FAB - Yeni İş (Ana sayfa, İşlerim ve Yeni İş sayfasında gizli; mobilde her zaman gizli) */}
      {pathname !== '/customer' && pathname !== '/customer/jobs' && pathname !== '/customer/new-job' && (
        <Link
          href="/customer/new-job"
          className="hidden md:flex fixed right-5 bottom-8 z-[95] bg-slate-900 hover:bg-slate-800 text-white w-14 h-14 rounded-2xl shadow-lg shadow-slate-900/30 items-center justify-center text-2xl font-bold hover:scale-105 active:scale-95 transition-transform"
          aria-label="Yeni iş oluştur"
        >
          <Plus className="w-7 h-7" />
        </Link>
      )}

      </div>
    </ChatOverlayProvider>
  )
}
