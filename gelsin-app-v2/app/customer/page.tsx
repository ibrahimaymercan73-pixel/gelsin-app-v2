'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search } from 'lucide-react'
import { SERVICE_CATEGORIES } from '@/lib/constants'

const CTA_CARDS = [
  { title: 'Yeni İş', icon: '➕', href: '/customer/new-job' },
  { title: 'Aktif İşlerim', icon: '📋', href: '/customer/jobs' },
  { title: 'Geçmiş İşler', icon: '🕒', href: '/customer/jobs' },
]

const MAIN_CATEGORIES = SERVICE_CATEGORIES.slice(0, 4)

// Pill etiketleri (Bionluk tarzı) – yaygın aramalar + kategoriler
const PILL_LABELS = [
  'Kombi Bakımı',
  'Temizlik',
  'Boya',
  'Tesisat',
  ...MAIN_CATEGORIES.flatMap((c) => [c.name, ...c.sub.slice(0, 1)]),
].filter((v, i, a) => a.indexOf(v) === i).slice(0, 10)

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

function getInitials(name: string): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
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
      for (const x of profiles || []) nameBy[x.id] = x.full_name || 'Uzman'
      for (const x of pp || []) ratingBy[x.id] = Number(x.rating) || 0
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

  const handleSearch = (q?: string) => {
    const term = (q ?? searchQuery).trim()
    if (term) router.push(`/customer/providers?q=${encodeURIComponent(term)}`)
    else router.push('/customer/providers')
  }

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 box-border flex flex-col gap-6">
        {/* 1. Derinlik ve Karşılama (Soft UI) */}
        <section className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-700 font-bold text-lg shrink-0">
            {getInitials(userName)}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Merhaba {userName || 'Misafir'} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Bugün hangi konuda uzman bir ele ihtiyacın var?
            </p>
          </div>
        </section>

        {/* 2. Kompakt Arama + Hap etiketler */}
        <section className="shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Hangi uzmana ihtiyacın var? (Örn: Kombi bakımı, Boya...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => handleSearch()}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors shrink-0"
            >
              <Search className="w-4 h-4" />
              Arama
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {PILL_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleSearch(label)}
                className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* 3. Hızlı aksiyon kartları – kompakt yatay (h-24/h-32) */}
        <section className="shrink-0">
          <div className="grid grid-cols-3 gap-3">
            {CTA_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="flex items-center gap-4 p-4 h-24 sm:h-28 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                  {card.icon}
                </div>
                <span className="font-semibold text-slate-800 text-sm sm:text-base truncate">
                  {card.title}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Çift şerit: Vitrin + Popüler Hizmetler */}
        <section className="flex flex-col gap-6 shrink-0 min-h-0">
          {/* Üst şerit – Öne Çıkan Uzman İlanları (yatay carousel) */}
          {vitrinList.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-3">Öne Çıkan Uzman İlanları</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar snap-x snap-mandatory">
                {vitrinList.map((s) => (
                  <Link
                    key={s.id}
                    href={`/customer/services/${s.id}`}
                    className="flex-shrink-0 w-[260px] snap-center rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 overflow-hidden transition-all"
                  >
                    <div className="aspect-[4/3] bg-slate-100 relative">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🔧</div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-2">{s.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{s.provider_name}</p>
                      <div className="flex items-center justify-between mt-2">
                        {s.provider_rating != null && (
                          <span className="text-xs text-amber-600">★ {s.provider_rating.toFixed(1)}</span>
                        )}
                        <span className="font-bold text-blue-600">₺{Number(s.price).toFixed(0)}</span>
                      </div>
                      <span className="inline-block mt-2 w-full text-center py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">
                        Hemen Çağır
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Alt şerit – Popüler Hizmetler (zarif küçük kareler) */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3">Popüler Hizmetler</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MAIN_CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/customer/new-job?cat=${cat.id}`}
                  className="aspect-[1.1] min-h-0 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col items-center justify-center gap-2 p-3"
                >
                  <span className="text-2xl sm:text-3xl" aria-hidden>{cat.emoji}</span>
                  <span className="font-semibold text-slate-800 text-xs text-center leading-tight line-clamp-2">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Nasıl Çalışır? – Soft UI */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <h3 className="text-lg font-bold text-slate-900 text-center mb-6">Nasıl Çalışır?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xl mb-3">
                  {step.icon}
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{step.title}</h4>
                <p className="text-xs text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
