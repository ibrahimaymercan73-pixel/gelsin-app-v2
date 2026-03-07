'use client'

import Link from 'next/link'
import { ClipboardList, History, FileText, ChevronRight, Sparkles } from 'lucide-react'

const rows = [
  {
    icon: ClipboardList,
    title: 'Aktif İşlerim',
    description: 'Devam eden işleri takip et',
    href: '/customer/jobs?tab=progress',
  },
  {
    icon: History,
    title: 'Geçmiş İşlerim',
    description: 'Tamamlanan hizmetler',
    href: '/customer/jobs?tab=done',
  },
  {
    icon: FileText,
    title: 'Aldığım Teklifler',
    description: 'Gelen fiyatları gör',
    href: '/customer/jobs?tab=offers',
  },
]

export default function CustomerPanelPage() {
  return (
    <div className="min-h-dvh bg-slate-50 md:min-h-0">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-4">
        <h1 className="text-lg font-bold text-slate-900">Panel</h1>
        <p className="text-xs text-slate-500 mt-0.5">İşlerini ve tekliflerini yönet</p>
      </header>

      <div className="w-full max-w-lg mx-auto px-4 py-4 md:py-6">
        <ul className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {rows.map((item, i) => {
            const Icon = item.icon
            return (
              <li key={item.href} className="border-b border-slate-100 last:border-b-0">
                <Link
                  href={item.href}
                  className="flex items-center gap-4 w-full p-4 active:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Uzman Ol! – dikkat çekici */}
        <div className="mt-4">
          <Link
            href="/register?role=provider"
            className="flex items-center gap-4 w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md border border-amber-400/50 active:opacity-90 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold">Uzman Ol!</p>
              <p className="text-xs text-white/90 mt-0.5">Sisteme uzman olarak katıl</p>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  )
}
