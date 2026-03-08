'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, ClipboardList, History } from 'lucide-react'

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
  const [userName, setUserName] = useState('')
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

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-[100vw] overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-8">
        {/* Karşılama Banner'ı (Hero) – ferah degrade, yuvarlatılmış */}
        <section className="w-full rounded-2xl bg-gradient-to-r from-blue-50 to-slate-100 p-6 sm:p-8 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            Merhaba {userName || 'Misafir'} 👋
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-1">
            Bugün hangi konuda uzman bir ele ihtiyacın var?
          </p>
        </section>

        {/* 3'lü işlem kartları – bembeyaz, gölgeli, grid-cols-3 */}
        <section className="w-full min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {CTA_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`rounded-2xl bg-white shadow-md border border-slate-100 p-5 sm:p-6 flex flex-col gap-3 transition-all text-left min-h-[120px] ${
                    card.prominent
                      ? 'hover:shadow-lg hover:border-slate-200 ring-2 ring-slate-100 ring-offset-2 hover:ring-slate-200'
                      : 'hover:shadow-lg hover:border-slate-200'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      card.prominent ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">{card.title}</h2>
                    <p className="text-slate-500 text-sm mt-0.5">{card.sub}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Öne Çıkan Uzman İlanları – yatay kaydırmalı vitrin */}
        {vitrinList.length > 0 && (
          <section className="w-full min-w-0">
            <h2 className="text-base font-bold text-slate-800 mb-4">Öne Çıkan Uzman İlanları</h2>
            <div className="overflow-x-auto hide-scrollbar flex gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
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
      </div>
    </div>
  )
}
