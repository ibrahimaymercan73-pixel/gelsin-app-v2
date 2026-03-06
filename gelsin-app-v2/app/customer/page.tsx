'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search } from 'lucide-react'

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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero - Kişiselleştirilmiş karşılama */}
        <section className="text-center sm:text-left mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Merhaba {userName || ''} 👋
          </h1>
          <p className="mt-2 text-slate-500 text-sm sm:text-base">
            Bugün evinde neyi tamir etmek istersin?
          </p>
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
        <section>
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
      </div>
    </div>
  )
}
