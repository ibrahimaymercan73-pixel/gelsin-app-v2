'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type ProviderRow = {
  id: string
  bio: string | null
  service_categories: string[] | null
  rating: number | null
  total_reviews: number | null
  is_online: boolean | null
  profiles?: {
    full_name: string | null
    phone: string | null
    hide_phone: boolean | null
  } | null
}

const categoryMeta: Record<
  string,
  { label: string; icon: string; description: string }
> = {
  painting: {
    label: 'Boya & Badana',
    icon: '🎨',
    description: 'Daire boyama, alçı ve tadilat işleri için uzmanlar',
  },
  plumbing: {
    label: 'Su Tesisatı',
    icon: '🚰',
    description: 'Musluk, gider, petek ve tesisat tamiri',
  },
  electric: {
    label: 'Elektrik',
    icon: '⚡',
    description: 'Elektrik arızaları, aydınlatma ve sigorta işleri',
  },
  carpentry: {
    label: 'Marangoz',
    icon: '🪚',
    description: 'Dolap, kapı, parke ve ahşap uygulamalar',
  },
  cleaning: {
    label: 'Temizlik',
    icon: '🧹',
    description: 'Ev ve ofis temizliği için güvenilir ekipler',
  },
  assembly: {
    label: 'Montaj',
    icon: '🔩',
    description: 'Mobilya, TV, avize ve beyaz eşya montajı',
  },
}

export default function CustomerProvidersPage() {
  const [items, setItems] = useState<ProviderRow[]>([])
  const [allItems, setAllItems] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setCategory(params.get('category'))
    setSearchQ(params.get('q'))
  }, [])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      let query = supabase
        .from('provider_list_public')
        .select('id, bio, service_categories, rating, total_reviews, is_online, full_name, phone')
        .eq('status', 'approved')

      if (category) {
        query = query.contains('service_categories', [category])
      }

      const { data } = await query
      const list = (data || []).map((p: any) => ({
        ...p,
        profiles: {
          full_name: p.full_name,
          phone: p.phone ?? null,
          hide_phone: p.phone == null,
        },
      })) as ProviderRow[]
      setAllItems(list)
      setLoading(false)
    }

    load()
  }, [category])

  useEffect(() => {
    if (!searchQ?.trim()) {
      setItems(allItems)
      return
    }
    const q = searchQ.trim().toLowerCase()
    setItems(
      allItems.filter((p) => {
        const name = (p.profiles?.full_name || p.profiles?.phone || '').toLowerCase()
        const bio = (p.bio || '').toLowerCase()
        return name.includes(q) || bio.includes(q)
      })
    )
  }, [searchQ, allItems])

  const meta = category ? categoryMeta[category] : null
  const titleFromQ = searchQ?.trim()
    ? `"${searchQ}" araması`
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-sky-50">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-sky-50/80 backdrop-blur-md z-40 border-b border-sky-200/60">
        <div>
          <p className="text-xs font-bold text-sky-600 uppercase tracking-[0.2em]">
            Uzmanlar
          </p>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
            {titleFromQ ? (
              <span>{titleFromQ}</span>
            ) : meta ? (
              <>
                <span className="text-2xl">{meta.icon}</span>
                <span>{meta.label} Uzmanları</span>
              </>
            ) : (
              'Tüm Uzmanlar'
            )}
          </h1>
          {meta && (
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              {meta.description}
            </p>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-6 space-y-4">
        {items.length === 0 && (
          <div className="bg-white rounded-3xl p-10 text-center border border-sky-100">
            <div className="text-5xl mb-3">👷</div>
            <p className="font-bold text-slate-700 mb-1">
              Şu an bu kategoride uygun uzman bulunamadı
            </p>
            <p className="text-xs text-slate-400">
              Farklı bir zamanda tekrar deneyebilir veya genel ilan açabilirsiniz.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((p) => {
            const name =
              p.profiles?.full_name ||
              (!p.profiles?.hide_phone && p.profiles?.phone) ||
              'İsimsiz Uzman'
            const rating =
              typeof p.rating === 'number' && typeof p.total_reviews === 'number'
                ? `${p.rating.toFixed(1)} / 5 • ${p.total_reviews} değerlendirme`
                : 'Henüz değerlendirme yok'

            const tags =
              Array.isArray(p.service_categories) && p.service_categories.length > 0
                ? p.service_categories
                : []

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-4 border border-sky-100 shadow-sm flex gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-xl flex-shrink-0">
                  {meta?.icon || '👷'}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 truncate">{name}</p>
                    {p.is_online && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Çevrimiçi
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{rating}</p>
                  {p.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2">{p.bio}</p>
                  )}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-[10px] font-semibold text-sky-700"
                        >
                          {categoryMeta[t]?.label || t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

