'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole } from '@/lib/auth'

const navItems = [
  { href: '/admin', icon: '📊', label: 'Özet' },
  { href: '/admin/approvals', icon: '✅', label: 'Onay' },
  { href: '/admin/live', icon: '🗺️', label: 'Canlı' },
  { href: '/admin/finance', icon: '💰', label: 'Finans' },
  { href: '/admin/messages', icon: '💬', label: 'Mesajlar' },
  { href: '/admin/users', icon: '👥', label: 'Kullanıcılar' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const check = async () => {
      const { user, role } = await getCurrentUserAndRole()

      if (!user) {
        router.replace('/onboarding')
        return
      }

      if (role !== 'admin') router.replace('/customer')
    }
    check()
  }, [router])

  return (
    <div className="min-h-dvh bg-[#F4F7FA] flex font-sans">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex w-64 bg-slate-900 flex-col fixed h-full z-50">
        {/* Logo */}
        <div className="px-8 py-7 border-b border-white/5">
          <span className="text-xl font-black text-white italic tracking-tighter">
            GELSİN<span className="text-blue-500">.</span>
          </span>
          <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-widest">Admin Paneli</p>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1 mt-2 flex-1">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="px-4 py-3 rounded-2xl bg-white/5 text-center">
            <p className="text-xs text-slate-500 font-medium">🔒 Admin Erişimi</p>
          </div>
        </div>
      </aside>

      {/* ── ANA İÇERİK ── */}
      <main className="flex-1 lg:ml-64 pb-24 lg:pb-0">
        {children}
      </main>

      {/* ── MOBİL BOTTOM NAV ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg px-4 py-3 flex justify-around items-center z-[100] rounded-t-[2rem] shadow-2xl border-t border-white/10">
        {navItems.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${
                isActive ? 'text-blue-400' : 'text-slate-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
