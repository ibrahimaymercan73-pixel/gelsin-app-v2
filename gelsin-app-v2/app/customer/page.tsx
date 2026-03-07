'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, Sparkles } from 'lucide-react'
import { SERVICE_CATEGORIES } from '@/lib/constants'

const CTA_CARDS = [
  {
    title: 'Yeni İş Talebi Oluştur',
    icon: '➕',
    description: 'Uzmanlardan hemen teklif al',
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

// Gerçek 4 ana kategori (new-job'a yönlendir)
const MAIN_CATEGORIES = SERVICE_CATEGORIES.slice(0, 4)

const HOW_IT_WORKS = [
  { icon: '📝', title: 'İhtiyacını Belirt', desc: 'Detayları ve konumu yaz' },
  { icon: '💬', title: 'Teklifleri Karşılaştır', desc: 'Uzmanlardan gelen fiyatları gör' },
  { icon: '✅', title: 'İşin Çözülsün', desc: 'Onayla ve arkanı yaslan' },
]

type VitrinService = {
  id: string
  title: string
  description: string | null
  price: number
  image_url: string | null
  provider_id: string
  provider_name: string
  provider_rating: number | null
}

export default function CustomerHome() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [vitrinList, setVitrinList] = useState<VitrinService[]>([])

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

  useEffect(() => {
    const loadVitrin = async () => {
      const supabase = createClient()
      const { data: rows } = await supabase
        .from('provider_services')
        .select('id, title, description, price, image_url, provider_id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)
      if (!rows?.length) {
        setVitrinList([])
        return
      }
      const providerIds = Array.from(new Set(rows.map((r: any) => r.provider_id)))
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name')
        .in('id', providerIds)
      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('id, rating')
        .in('id', providerIds)
      const nameBy: Record<string, string> = {}
      const ratingBy: Record<string, number> = {}
      for (const x of profiles || []) {
        nameBy[x.id] = x.full_name || 'Uzman'
      }
      for (const x of pp || []) {
        ratingBy[x.id] = Number(x.rating) || 0
      }
      setVitrinList(
        rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          price: r.price,
          image_url: r.image_url,
          provider_id: r.provider_id,
          provider_name: nameBy[r.provider_id] || 'Uzman',
          provider_rating: ratingBy[r.provider_id] ?? null,
        }))
      )
    }
    loadVitrin()
  }, [])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/customer/providers?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/customer/providers')
    }
  }

  return (
    <div className="min-h-screen bg-white w-full max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 box-border">
        {/* Hero */}
        <section className="text-center sm:text-left mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Merhaba {userName || ''} 👋
          </h1>
          <p className="mt-2 text-slate-500 text-sm sm:text-base">
            Bugün hangi konuda uzman bir ele ihtiyacın var?
          </p>
        </section>

        {/* Duyuru banner */}
        <section className="mb-8">
          <div className="flex items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
            <p className="text-sm sm:text-base font-semibold leading-snug flex-1">
              İhtiyaçlarını erteleme! Alanında uzman profesyonellerden anında teklif al ve işini hızlıca çöz.
            </p>
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>
        </section>

        {/* Arama çubuğu */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl border border-gray-200 shadow-md">
            <input
              type="text"
              placeholder="Hangi uzmana ihtiyacın var? (Örn: Musluk tamiri, Boya...)"
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

        {/* Hızlı eylem kartları - Mobilde carousel, masaüstünde grid */}
        <section className="mb-12">
          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-3 md:overflow-visible md:snap-none md:gap-4">
            {CTA_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group flex-shrink-0 w-[85%] min-w-[85%] sm:min-w-[300px] snap-center md:min-w-0 md:w-auto p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left"
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

        {/* Öne çıkan uzman ilanları (vitrin) */}
        {vitrinList.length > 0 && (
          <section className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Öne Çıkan Uzman İlanları</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar snap-x snap-mandatory">
              {vitrinList.map((s) => (
                <Link
                  key={s.id}
                  href={`/customer/services/${s.id}`}
                  className="flex-shrink-0 w-[280px] snap-center rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 overflow-hidden transition-all"
                >
                  <div className="aspect-[4/3] bg-slate-100 relative">
                    {s.image_url ? (
                      <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🔧</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-2">{s.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{s.provider_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      {s.provider_rating != null && (
                        <span className="text-xs text-amber-600">★ {s.provider_rating.toFixed(1)}</span>
                      )}
                      <span className="font-black text-blue-600">₺{Number(s.price).toFixed(0)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Gerçek ana kategoriler - new-job'a yönlendir */}
        <section className="mb-14">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Popüler Hizmetler</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MAIN_CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/customer/new-job?cat=${cat.id}`}
                  className="aspect-square w-full min-w-0 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-3 p-4"
                >
                  <span className="text-4xl" aria-hidden>{cat.emoji}</span>
                  <span className="font-semibold text-slate-800 text-sm text-center leading-tight">
                    {cat.name}
                  </span>
                  <span className="text-xs text-slate-400 text-center line-clamp-2">
                    {cat.sub.slice(0, 2).join(', ')}
                  </span>
                </Link>
              ))}
          </div>
        </section>
      </div>

      {/* Nasıl Çalışır? - Premium grid */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
          <h3 className="text-lg font-bold text-slate-900 text-center mb-8">Nasıl Çalışır?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-4">
                  {step.icon}
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">{step.title}</h4>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
