'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

export default function SoforSectionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const publicPaths = ['/sofor/giris', '/sofor/kayit']
    if (publicPaths.includes(pathname)) {
      setOk(true)
      return
    }
    const run = async () => {
      const supabase = createHizmetlerClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/sofor/giris')
        return
      }
      setOk(true)
    }
    run()
  }, [router, pathname])

  if (!ok) return <div />

  const items = [
    { href: '/sofor', label: 'Ana Sayfa', icon: '🏠' },
    { href: '/sofor/ilanlar', label: 'İlanlar', icon: '📋' },
    { href: '/sofor/profil', label: 'Profil', icon: '👤' },
  ] as const

  return (
    <div className="min-h-dvh bg-indigo-950 text-slate-100">
      <div className="pb-24">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-indigo-950/95 backdrop-blur border-t border-indigo-800">
        <div className="max-w-lg mx-auto px-4 py-3 grid grid-cols-3 gap-2">
          {items.map((it) => {
            const active = pathname === it.href
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`rounded-2xl px-2 py-2 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                  active ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
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

