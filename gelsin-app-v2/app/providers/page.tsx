'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'

const categoryMeta: Record<string, { label: string; icon: string; description: string }> = {
  painting: { label: 'Boya & Badana', icon: '🎨', description: 'Daire boyama, alçı ve tadilat işleri için ustalar' },
  plumbing: { label: 'Su Tesisatı', icon: '🚰', description: 'Musluk, gider, petek ve tesisat tamiri' },
  electric: { label: 'Elektrik', icon: '⚡', description: 'Elektrik arızaları, aydınlatma ve sigorta işleri' },
  carpentry: { label: 'Marangoz', icon: '🪚', description: 'Dolap, kapı, parke ve ahşap uygulamalar' },
  cleaning: { label: 'Temizlik', icon: '🧹', description: 'Ev ve ofis temizliği için güvenilir ekipler' },
  assembly: { label: 'Montaj', icon: '🔩', description: 'Mobilya, TV, avize ve beyaz eşya montajı' },
}

type ProviderRow = {
  id: string
  bio: string | null
  service_categories: string[] | null
  rating: number | null
  total_reviews: number | null
  is_online: boolean | null
  profiles?: { full_name: string | null; phone: string | null } | null
}

export default function PublicProvidersPage() {
  const [items, setItems] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setCategory(params.get('category'))
  }, [])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      let query = supabase
        .from('provider_profiles')
        .select('id, bio, service_categories, rating, total_reviews, is_online, profiles(full_name, phone)')
        .eq('status', 'approved')
      if (category) query = query.contains('service_categories', [category])
      const { data } = await query
      setItems(((data || []) as unknown) as ProviderRow[])
      setLoading(false)
    }
    load()
  }, [category])

  const meta = category ? categoryMeta[category] : null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Ana sayfa
          </Link>
          <Link
            href="/login"
            className="px-4 py-2.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all text-sm"
          >
            Giriş Yap
          </Link>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            {meta ? (
              <>
                <span className="text-3xl">{meta.icon}</span>
                {meta.label} Ustaları
              </>
            ) : (
              'Tüm Ustalar'
            )}
          </h1>
          {meta && (
            <p className="text-slate-500 text-sm mt-1 max-w-xl">{meta.description}</p>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
            <div className="text-5xl mb-4">👷</div>
            <p className="font-bold text-slate-800 text-lg mb-1">Bu kategoride henüz usta yok</p>
            <p className="text-slate-500 text-sm">Farklı bir kategori deneyin veya <Link href="/" className="text-slate-800 font-semibold underline">ana sayfadan</Link> arayın.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {items.map((p) => {
              const name = p.profiles?.full_name || p.profiles?.phone || 'Usta'
              const ratingStr =
                typeof p.rating === 'number' && typeof p.total_reviews === 'number'
                  ? `${p.rating.toFixed(1)} / 5 · ${p.total_reviews} değerlendirme`
                  : 'Henüz değerlendirme yok'
              const tags = Array.isArray(p.service_categories) ? p.service_categories : []

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-700 shrink-0">
                      {name[0]}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-lg truncate">{name}</p>
                        {p.is_online && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Çevrimiçi
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{ratingStr}</p>
                      {p.bio && (
                        <p className="text-sm text-slate-600 line-clamp-2">{p.bio}</p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
                            >
                              {categoryMeta[t]?.label || t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                    Teklif almak veya mesaj atmak için <Link href="/login" className="text-slate-800 font-semibold underline">giriş yapın</Link>.
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
