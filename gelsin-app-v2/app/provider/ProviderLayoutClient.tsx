'use client'

import { createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Radar,
  BriefcaseBusiness,
  MessageCircle,
  UserRound,
} from 'lucide-react'
import { ChatOverlayProvider } from '@/components/ChatOverlay'
import { useNotifications, NotificationBadge } from '@/components/NotificationProvider'
import { useUpdatePresence } from '@/hooks/useUpdatePresence'
import { OnboardingTour } from '@/components/OnboardingTour'

const navItems = [
  { href: '/provider', icon: LayoutDashboard, label: 'Özet', showBadge: false, tourId: null as string | null },
  { href: '/provider/jobs', icon: Radar, label: 'Radar', showBadge: false, tourId: 'tour-radar' as string | null },
  { href: '/provider/my-jobs', icon: BriefcaseBusiness, label: 'İşlerim', showBadge: false, tourId: null },
  { href: '/provider/notifications', icon: MessageCircle, label: 'Mesajlar', showBadge: true, tourId: null },
  { href: '/provider/profile', icon: UserRound, label: 'Profil', showBadge: false, tourId: null },
]

export type ProviderProfile = {
  id: string
  full_name: string
  phone: string
  city: string
  hide_phone: boolean
  face_verified?: boolean
  avatar_url?: string | null
} | null

export type ProviderProfileExtra = Record<string, unknown> | null

const ProviderAuthContext = createContext<{
  providerName: string
  profile: ProviderProfile
  providerProfile: ProviderProfileExtra
  email: string | null
}>({ providerName: '', profile: null, providerProfile: null, email: null })

export function useProviderAuth() {
  return useContext(ProviderAuthContext)
}

export function ProviderLayoutClient({
  children,
  initialProviderName,
  initialProfile,
  initialProviderProfile,
  initialEmail,
}: {
  children: React.ReactNode
  initialProviderName: string
  initialProfile: ProviderProfile
  initialProviderProfile: ProviderProfileExtra
  initialEmail: string | null
}) {
  const pathname = usePathname()
  const { unreadMessageCount, unreadNotificationCount } = useNotifications()
  const unreadCount = unreadMessageCount + unreadNotificationCount
  useUpdatePresence()

  const hideBottomNav = pathname.startsWith('/provider/chat')

  return (
    <ProviderAuthContext.Provider
      value={{
        providerName: initialProviderName,
        profile: initialProfile,
        providerProfile: initialProviderProfile,
        email: initialEmail,
      }}
    >
      <ChatOverlayProvider>
        <OnboardingTour role="provider" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-sky-50/40 flex font-sans antialiased text-slate-900">
          <aside className="hidden lg:flex w-[4.75rem] xl:w-56 flex-col fixed h-full z-50 border-r border-white/60 bg-white/45 backdrop-blur-xl shadow-[inset_-1px_0_0_rgba(15,23,42,0.04)]">
            <div className="px-3 xl:px-4 py-5 border-b border-slate-200/50">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 block truncate">
                GELSİN<span className="text-violet-600">.</span>
              </span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mt-1 hidden xl:block">
                Uzman
              </p>
            </div>
            <nav className="p-2 xl:p-3 space-y-0.5 mt-1 flex-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    {...(item.tourId ? { id: item.tourId } : {})}
                    title={item.label}
                    className={`group flex items-center gap-2.5 px-2.5 xl:px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600/10 to-sky-600/10 text-violet-700 shadow-sm ring-1 ring-violet-500/15'
                        : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                    }`}
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm ring-1 ring-slate-200/60 group-hover:ring-violet-200/80">
                      <Icon className="h-[18px] w-[18px] stroke-[2]" aria-hidden />
                      {item.showBadge && <NotificationBadge count={unreadCount} />}
                    </span>
                    <span className="hidden xl:inline truncate">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="p-2 xl:p-3 border-t border-slate-200/50">
              <div className="rounded-xl bg-gradient-to-br from-violet-500/8 to-sky-500/8 px-2 py-2 text-center ring-1 ring-slate-200/40">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden xl:block">
                  Hesap
                </p>
                <p className="text-[10px] text-violet-600 font-semibold xl:hidden">●</p>
              </div>
            </div>
          </aside>

          <main className="flex-1 lg:ml-[4.75rem] xl:ml-56 pb-24 md:pb-0 overflow-y-auto min-h-screen">
            {children}
          </main>

          {!hideBottomNav && (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-xl px-1 py-2 flex justify-between items-center z-[100] rounded-t-3xl shadow-[0_-8px_32px_rgba(15,23,42,0.08)] border-t border-white/80 pb-[env(safe-area-inset-bottom,8px)]">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    {...(item.tourId ? { id: item.tourId } : {})}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 rounded-xl transition-all ${
                      isActive ? 'text-violet-600' : 'text-slate-400'
                    }`}
                  >
                    <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80">
                      <Icon className="h-[18px] w-[18px] stroke-[2]" aria-hidden />
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
    </ProviderAuthContext.Provider>
  )
}
