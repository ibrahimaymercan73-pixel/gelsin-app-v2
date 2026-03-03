'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole } from '@/lib/auth'

const navItems = [
  { href: '/customer', icon: '🏠', label: 'Ana Sayfa' },
  { href: '/customer/jobs', icon: '📋', label: 'İşlerim' },
  { href: '/customer/profile', icon: '👤', label: 'Profilim' },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

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

  return (
    <div className="min-h-dvh bg-sky-50 flex font-sans">

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-slate-950 flex-col fixed h-full z-50">
        <div className="px-8 py-7 border-b border-white/5">
          <span className="text-xl font-black text-white italic tracking-tighter">
            GELSİN<span className="text-blue-500">.</span>
          </span>
          <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-widest">Müşteri Paneli</p>
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
          <Link href="/customer/new-job"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/30">
            <span>➕</span> Yeni İş Talebi
          </Link>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <main className="flex-1 lg:ml-64 pb-24 lg:pb-0">
        {children}
      </main>

      {/* MOBİL BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-slate-950/95 backdrop-blur-lg px-4 py-3 flex justify-around items-center z-[90] rounded-[2rem] shadow-2xl border border-white/10">
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
        <Link href="/customer/new-job"
          className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-slate-400">
          <span className="text-xl">➕</span>
          <span className="text-[10px] font-bold">Yeni İş</span>
        </Link>
      </nav>

      {/* Floating Action Button - Yeni İş */}
      <Link
        href="/customer/new-job"
        className="fixed right-5 bottom-24 lg:bottom-8 z-[95] bg-gradient-to-br from-sky-500 to-emerald-500 text-white w-14 h-14 rounded-full shadow-xl shadow-sky-900/40 flex items-center justify-center text-3xl hover:scale-105 transition-transform"
        aria-label="Yeni iş oluştur"
      >
        +
      </Link>

    </div>
  )
}
