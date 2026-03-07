'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search } from 'lucide-react'
import { SERVICE_CATEGORIES } from '@/lib/constants'

const CTA_CARDS = [
  { title: 'Yeni İş Talebi Oluştur', icon: '➕', href: '/customer/new-job' },
  { title: 'Aktif İşlerim', icon: '📋', href: '/customer/jobs' },
  { title: 'Geçmiş İşler', icon: '🕒', href: '/customer/jobs' },
]

const MAIN_CATEGORIES = SERVICE_CATEGORIES.slice(0, 4)
const PILL_LABELS = [
  'Kombi Tamiri',
  'Boya & Badana',
  'Temizlik',
  'Tesisat',
  ...MAIN_CATEGORIES.flatMap((c) => [c.name, ...c.sub.slice(0, 1)]),
].filter((v, i, a) => a.indexOf(v) === i).slice(0, 10)

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
      const { data: profiles } = await supabase.from('profiles_public').select('id, full_name').in('id', providerIds)
      const { data: pp } = await supabase.from('provider_profiles').select('id, rating').in('id', providerIds)
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
    <div className="min-h-screen bg-[#F8F9F8] w-full max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col justify-start items-start text-left pt-6 sm:pt-8 lg:pt-12 pb-24 sm:pb-28 px-4 sm:px-6 lg:px-8 gap-6 sm:gap-8 min-w-0">
        {/* Karşılama */}
        <section className="w-full min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            Merhaba {userName || 'Misafir'}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">Bugün hangi konuda uzman bir ele ihtiyacın var?</p>
        </section>

        {/* Arama – beyaz, mobilde tam genişlik */}
        <section className="w-full flex flex-col items-center min-w-0">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-md p-2 flex flex-col sm:flex-row gap-2 border border-slate-100">
            <div className="flex-1 flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-slate-50/80 min-w-0">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Hangi uzmana ihtiyacın var? (Örn: Kombi, Boya...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 min-w-0 bg-transparent text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 sm:px-5 py-3 rounded-xl font-semibold text-sm transition-colors shrink-0"
            >
              <Search className="w-4 h-4" />
              Arama
            </button>
          </div>
          <div className="w-full max-w-2xl flex flex-row overflow-x-auto hide-scrollbar gap-2 mt-4 pb-1 min-w-0 -mx-1 px-1">
            {PILL_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleSearch(label)}
                className="flex-shrink-0 px-4 py-2 text-sm bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors touch-manipulation"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Hızlı işlem kartları – mobilde alt alta, md’de 3’lü grid */}
        <section className="w-full min-w-0">
          <div className="w-full flex flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-3">
            {CTA_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="p-4 sm:p-5 flex items-center gap-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-left min-h-[72px] sm:min-h-0 touch-manipulation"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                  {card.icon}
                </div>
                <span className="font-semibold text-slate-800 text-sm sm:text-base">{card.title}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Öne Çıkan Uzman İlanları – sola yaslı, yatay kaydırma */}
        {vitrinList.length > 0 && (
          <section className="w-full min-w-0">
            <h2 className="text-base font-bold text-slate-800 mb-3 text-left">Öne Çıkan Uzman İlanları</h2>
            <div className="w-full overflow-x-auto hide-scrollbar flex gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
              {vitrinList.map((s) => (
                <Link
                  key={s.id}
                  href={`/customer/services/${s.id}`}
                  className="flex-shrink-0 w-[260px] sm:w-[280px] snap-center rounded-2xl bg-white border border-slate-100 shadow-md hover:shadow-lg overflow-hidden transition-all hover:border-slate-200 touch-manipulation"
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
                    <span className="inline-block mt-3 w-full text-center py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors">
                      Hemen Çağır
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="w-full min-w-0">
          <h2 className="text-base font-bold text-slate-800 mb-3 text-left">Popüler Hizmetler</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {MAIN_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/customer/new-job?cat=${cat.id}`}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 flex flex-col items-center justify-center gap-2 p-4 sm:p-5 min-h-[88px] sm:min-h-[100px] transition-all touch-manipulation"
              >
                <span className="text-2xl sm:text-3xl" aria-hidden>{cat.emoji}</span>
                <span className="font-semibold text-slate-800 text-xs sm:text-sm text-center leading-tight line-clamp-2">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
