'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SERVICE_CATEGORIES } from '@/lib/constants'
import { Plus, ClipboardList, History, Search } from 'lucide-react'

const CTA_CARDS = [
  {
    title: 'Yeni İş Aç',
    sub: 'Hemen teklifleri topla',
    href: '/customer/new-job',
    icon: Plus,
    prominent: true,
  },
  {
    title: 'Aktif İşlerim',
    sub: 'Devam eden işlerini takip et',
    href: '/customer/jobs',
    icon: ClipboardList,
    prominent: false,
  },
  {
    title: 'Geçmiş İşlerim',
    sub: 'Tamamlanan hizmetlerin',
    href: '/customer/jobs?filter=completed',
    icon: History,
    prominent: false,
  },
]

const PILL_LABELS = [
  'Kombi Tamiri',
  'Boya & Badana',
  'Temizlik',
  'Tesisat',
  ...SERVICE_CATEGORIES.flatMap((c) => [c.name, ...c.sub.slice(0, 1)]),
].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12)

const MAIN_CATEGORIES = SERVICE_CATEGORIES.slice(0, 8)

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
      const providerIds = Array.from(new Set(rows.map((r: { provider_id: string }) => r.provider_id)))
      const { data: profiles } = await supabase.from('profiles_public').select('id, full_name').in('id', providerIds)
      const { data: pp } = await supabase.from('provider_profiles').select('id, rating').in('id', providerIds)
      const nameBy: Record<string, string> = {}
      const ratingBy: Record<string, number> = {}
      for (const x of profiles || []) nameBy[x.id] = x.full_name || 'Uzman'
      for (const x of pp || []) ratingBy[x.id] = Number(x.rating) || 0
      setVitrinList(
        rows.map((r: {
          id: string
          title: string
          description: string | null
          price: number
          image_url: string | null
          provider_id: string
        }) => ({
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

  const handleSearch = (q?: string) => {
    const term = (q ?? searchQuery).trim()
    if (term) router.push(`/customer/providers?q=${encodeURIComponent(term)}`)
    else router.push('/customer/providers')
  }

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-10">
        {/* Devasa Hero Section – karşılama + arama + hap etiketleri */}
        <section className="w-full min-h-[260px] p-8 md:p-12 rounded-3xl bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50/30 flex flex-col justify-center relative overflow-hidden min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            Merhaba {userName || 'Misafir'} 👋
          </h1>
          <p className="text-slate-600 text-base md:text-lg mt-2">
            Bugün hangi konuda uzman bir ele ihtiyacın var?
          </p>

          {/* Devasa arama çubuğu – Hero'nun içinde */}
          <div className="mt-6 md:mt-8 w-full max-w-2xl">
            <div className="w-full bg-white rounded-2xl shadow-md border border-slate-100 p-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50/80 min-w-0">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Hangi uzmana ihtiyacın var? (Örn: Kombi, Boya, Temizlik...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 min-w-0 bg-transparent text-slate-800 placeholder:text-slate-500 text-sm md:text-base focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearch()}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors shrink-0"
              >
                <Search className="w-5 h-5" />
                Ara
              </button>
            </div>
          </div>

          {/* Hap etiketleri – Hero'nun içinde, arama barının altında */}
          <div className="mt-4 flex flex-wrap gap-2">
            {PILL_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleSearch(label)}
                className="px-4 py-2 text-sm font-medium bg-white/90 hover:bg-white border border-slate-200/80 rounded-full text-slate-700 hover:shadow-sm transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* 3'lü hızlı aksiyon kartları – tok, şişkin */}
        <section className="w-full min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
            {CTA_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`rounded-2xl bg-white shadow-md border border-slate-100 p-6 md:p-8 flex flex-col gap-4 transition-all text-left min-h-[160px] ${
                    card.prominent
                      ? 'hover:shadow-lg hover:border-slate-200 ring-2 ring-slate-100 ring-offset-2 hover:ring-slate-200'
                      : 'hover:shadow-lg hover:border-slate-200'
                  }`}
                >
                  <div
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 ${
                      card.prominent ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg md:text-xl">{card.title}</h2>
                    <p className="text-slate-500 text-sm md:text-base mt-1">{card.sub}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Öne Çıkan Uzman İlanları – yatay kaydırmalı vitrin */}
        {vitrinList.length > 0 && (
          <section className="w-full min-w-0">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Öne Çıkan Uzman İlanları</h2>
            <div className="overflow-x-auto hide-scrollbar flex gap-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
              {vitrinList.map((s) => (
                <Link
                  key={s.id}
                  href={`/customer/services/${s.id}`}
                  className="flex-shrink-0 w-[260px] sm:w-[280px] snap-center rounded-2xl bg-white border border-slate-100 shadow-md hover:shadow-lg overflow-hidden transition-all hover:border-slate-200"
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    {s.image_url ? (
                      <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🔧</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2">{s.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{s.provider_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      {s.provider_rating != null && (
                        <span className="text-xs text-amber-600">★ {s.provider_rating.toFixed(1)}</span>
                      )}
                      <span className="font-bold text-slate-800">₺{Number(s.price).toFixed(0)}</span>
                    </div>
                    <span className="inline-block mt-3 w-full text-center py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors">
                      Hemen Çağır
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Popüler Hizmetler – vitrinin altında, sayfa aşağıya aksın */}
        <section className="w-full min-w-0">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Popüler Hizmetler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {MAIN_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/customer/new-job?cat=${cat.id}`}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 flex flex-col items-center justify-center gap-3 p-5 md:p-6 min-h-[100px] transition-all"
              >
                <span className="text-3xl md:text-4xl" aria-hidden>{cat.emoji}</span>
                <span className="font-semibold text-slate-800 text-sm md:text-base text-center leading-tight line-clamp-2">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
