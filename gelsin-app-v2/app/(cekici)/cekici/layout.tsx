'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function CekiciSectionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const items = [
    { href: '/cekici', label: 'Ana Sayfa', icon: '🏠' },
    { href: '/cekici/ilanlar', label: 'İlanlar', icon: '📋' },
    { href: '/cekici/profil', label: 'Profil', icon: '👤' },
  ] as const

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="pb-24">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur border-t border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 grid grid-cols-3 gap-2">
          {items.map((it) => {
            const active = pathname === it.href
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`rounded-2xl px-2 py-2 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                  active ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-lg leading-none">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

