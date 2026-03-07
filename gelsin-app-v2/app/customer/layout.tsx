'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, ClipboardList, Bell, User, Plus } from 'lucide-react'
import { getCurrentUserAndRole } from '@/lib/auth'
import { ChatOverlayProvider } from '@/components/ChatOverlay'
import { useNotifications, NotificationBadge } from '@/components/NotificationProvider'

const navItems = [
  { href: '/customer', icon: Home, label: 'Ana Sayfa', showBadge: false },
  { href: '/customer/jobs', icon: ClipboardList, label: 'İşlerim', showBadge: false },
  { href: '/customer/notifications', icon: Bell, label: 'Mesajlar', showBadge: true },
  { href: '/customer/profile', icon: User, label: 'Profilim', showBadge: false },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { unreadCount } = useNotifications()

  useEffect(() => {
    const ensureAuthenticated = async () => {
      const { user, role } = await getCurrentUserAndRole()

      if (!user) {
        router.replace('/onboarding')
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
    }

    ensureAuthenticated()
  }, [router])

  const hideBottomNav = pathname.startsWith('/customer/chat')

  return (
    <ChatOverlayProvider>
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
          {navItems.map(item => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                  isActive ? 'bg-slate-900/5 text-slate-900' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}>
                <span className="relative">
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.showBadge && <NotificationBadge count={unreadCount} />}
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

      {/* MOBİL BOTTOM NAV - glassmorphism */}
      {!hideBottomNav && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md px-3 py-2.5 flex justify-around items-center z-[90] rounded-t-[2rem] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] border-t border-stone-200/80">
          {navItems.map(item => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                  isActive ? 'text-slate-900' : 'text-stone-500'
                }`}>
                <span className="relative">
                  <Icon className="w-6 h-6" />
                  {item.showBadge && <NotificationBadge count={unreadCount} />}
                </span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            )
          })}
          <Link href="/customer/new-job"
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-stone-500 active:scale-95">
            <Plus className="w-6 h-6" />
            <span className="text-[10px] font-bold">Yeni İş</span>
          </Link>
        </nav>
      )}

      {/* FAB - Yeni İş (İşlerim ve Yeni İş sayfasında gizli) */}
      {pathname !== '/customer/jobs' && pathname !== '/customer/new-job' && (
        <Link
          href="/customer/new-job"
          className="fixed right-5 bottom-24 lg:bottom-8 z-[95] bg-slate-900 hover:bg-slate-800 text-white w-14 h-14 rounded-2xl shadow-lg shadow-slate-900/30 flex items-center justify-center text-2xl font-bold hover:scale-105 active:scale-95 transition-transform"
          aria-label="Yeni iş oluştur"
        >
          <Plus className="w-7 h-7" />
        </Link>
      )}

      </div>
    </ChatOverlayProvider>
  )
}
