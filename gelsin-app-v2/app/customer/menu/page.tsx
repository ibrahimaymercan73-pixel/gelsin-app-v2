'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Bell, Settings, Lock, Info, HelpCircle, LogOut, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const sections = [
  {
    title: 'menü',
    items: [
      { icon: User, label: 'Benim Profilim', href: '/customer/profile' },
      { icon: Bell, label: 'Bildirimlerim', href: '/customer/notifications' },
    ],
  },
  {
    title: 'ayarlar',
    items: [
      { icon: Settings, label: 'Genel Ayarlar', href: '/customer/profile#settings' },
      { icon: Lock, label: 'Şifre ve Güvenlik', href: '/customer/profile#security' },
    ],
  },
  {
    title: 'linkler',
    items: [
      { icon: Info, label: 'Hakkımızda', href: '/customer/menu/about' },
      { icon: HelpCircle, label: 'Destek', href: '/customer/menu/support' },
    ],
  },
]

export default function CustomerMenuPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.replace('/')
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-4">
        <h1 className="text-lg font-bold text-slate-900">Diğer</h1>
        <p className="text-xs text-slate-500 mt-0.5">Profil, ayarlar ve yardım</p>
      </header>

      <div className="w-full max-w-lg mx-auto px-4 py-4 md:py-6 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <ul className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href} className="border-b border-slate-100 last:border-b-0">
                    <Link
                      href={item.href}
                      className="flex items-center gap-4 w-full p-4 active:bg-slate-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <span className="flex-1 font-medium text-slate-900">{item.label}</span>
                      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {/* Çıkış Yap – kırmızı */}
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">
            Hesap
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-4 w-full p-4 text-red-500 active:bg-red-50/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="flex-1 font-semibold">Çıkış Yap</span>
              <ChevronRight className="w-5 h-5 text-red-300 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
