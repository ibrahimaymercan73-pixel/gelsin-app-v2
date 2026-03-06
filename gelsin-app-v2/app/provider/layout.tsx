'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole } from '@/lib/auth'
import { ChatOverlayProvider } from '@/components/ChatOverlay'

const navItems = [
  { href: '/provider', icon: '📊', label: 'Özet' },
  { href: '/provider/jobs', icon: '🔍', label: 'Radar' },
  { href: '/provider/my-jobs', icon: '🔨', label: 'İşlerim' },
  { href: '/provider/notifications', icon: '🔔', label: 'Mesajlar' },
  { href: '/provider/wallet', icon: '💰', label: 'Cüzdan' },
  { href: '/provider/profile', icon: '👤', label: 'Profil' },
]

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const check = async () => {
      const { user, role } = await getCurrentUserAndRole()

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
    }
    check()
  }, [router])

  const hideBottomNav = pathname.startsWith('/provider/chat')

  return (
    <ChatOverlayProvider>
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
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
                  isActive ? 'bg-blue-600/15 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}>
                <span className="text-lg">{item.icon}</span>
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

      <main className="flex-1 lg:ml-64 pb-24 lg:pb-0">
        {children}
      </main>

      {!hideBottomNav && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg px-2 py-3 flex justify-around items-center z-[100] rounded-t-3xl shadow-2xl border-t border-white/10">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${
                  isActive ? 'text-blue-400' : 'text-slate-500'
                }`}>
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
      </div>
    </ChatOverlayProvider>
  )
}
