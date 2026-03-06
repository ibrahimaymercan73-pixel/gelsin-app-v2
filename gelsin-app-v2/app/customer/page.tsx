'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, Sparkles } from 'lucide-react'

const POPULAR_SEARCHES = [
  { label: 'Tesisat', category: 'plumbing' },
  { label: 'Boya & Badana', category: 'painting' },
  { label: 'Temizlik', category: 'cleaning' },
  { label: 'Montaj', category: 'assembly' },
  { label: 'Elektrik', category: 'electric' },
]

const CTA_CARDS = [
  {
    title: 'Yeni İş Talebi Oluştur',
    icon: '➕',
    description: 'Ustalardan hemen teklif al',
    href: '/customer/new-job',
  },
  {
    title: 'Aktif İşlerim',
    icon: '📋',
    description: 'Devam eden işlerini ve teklifleri gör',
    href: '/customer/jobs',
  },
  {
    title: 'Geçmiş İşler',
    icon: '🕒',
    description: 'Tamamlanan hizmetlerine göz at',
    href: '/customer/jobs',
  },
]

const POPULAR_SERVICES = [
  { icon: '🚰', label: 'Su Tesisatı', category: 'plumbing' },
  { icon: '🧹', label: 'Ev Temizliği', category: 'cleaning' },
  { icon: '🔌', label: 'Elektrik & Aydınlatma', category: 'electric' },
  { icon: '🛋️', label: 'Mobilya Montajı', category: 'assembly' },
]

const HOW_IT_WORKS = [
  { icon: '📝', title: 'İhtiyacını Belirt', desc: 'Detayları ve konumu yaz' },
  { icon: '💬', title: 'Teklifleri Karşılaştır', desc: 'Ustalardan gelen fiyatları gör' },
  { icon: '✅', title: 'İşin Çözülsün', desc: 'Onayla ve arkanı yaslan' },
]

export default function CustomerHome() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(p?.full_name?.trim() || '')
    }
    load()
  }, [])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/customer/providers?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/customer/providers')
    }
  }

  const handlePopularClick = (category: string) => {
    router.push(`/customer/providers?category=${category}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        {/* Hero - Kişiselleştirilmiş karşılama */}
        <section className="text-center sm:text-left mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Merhaba {userName || ''} 👋
          </h1>
          <p className="mt-2 text-slate-500 text-sm sm:text-base">
            Bugün evinde neyi tamir etmek istersin?
          </p>
        </section>

        {/* Dinamik duyuru banner */}
        <section className="mb-8">
          <div className="flex items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
            <p className="text-sm sm:text-base font-semibold leading-snug flex-1">
              Evinizdeki eksikleri ertelemeyin! Türkiye&apos;nin en iyi ustalarından hemen teklif alın.
            </p>
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>
        </section>

        {/* Devasa arama çubuğu */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl border border-gray-200 shadow-md">
            <input
              type="text"
              placeholder="Hangi ustaya ihtiyacın var? (Örn: Musluk tamiri, Boya...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0 px-4 py-3.5 sm:py-4 rounded-xl border border-gray-200 bg-gray-50/50 text-slate-900 placeholder:text-gray-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 sm:py-4 rounded-xl font-semibold text-sm transition-colors"
            >
              <Search className="w-4 h-4" />
              Arama Yap
            </button>
          </div>
        </section>

        {/* Popüler aramalar */}
        <section className="mb-10">
          <p className="text-xs text-gray-500 mb-3">Popüler Aramalar:</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((item) => (
              <button
                key={item.category}
                type="button"
                onClick={() => handlePopularClick(item.category)}
                className="px-4 py-2 rounded-full bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* Hızlı eylem kartları - Bento grid */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CTA_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group block p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 transition-colors">
                  {card.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-500">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Popüler Hizmetler vitrini */}
        <section className="mb-14">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Popüler Hizmetler</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {POPULAR_SERVICES.map((s) => (
              <button
                key={s.category}
                type="button"
                onClick={() => handlePopularClick(s.category)}
                className="aspect-square w-full rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:scale-105 transition-all flex flex-col items-center justify-center gap-3 p-4"
              >
                <span className="text-4xl">{s.icon}</span>
                <span className="font-semibold text-slate-800 text-sm text-center leading-tight">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Nasıl Çalışır? - Güven bandı */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
          <h3 className="text-lg font-bold text-slate-900 text-center mb-8">Nasıl Çalışır?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl mb-3 text-blue-600">
                  {step.icon}
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">Adım {i + 1}: {step.title}</h4>
                <p className="text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
