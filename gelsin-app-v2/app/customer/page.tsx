'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useCustomerAuth } from './CustomerLayoutClient'
import {
  Sparkles,
  MessageCircle,
  Search,
  ArrowRight,
  Droplet,
  Paintbrush,
  Wrench,
  Car,
  Zap,
  Scissors,
  Star,
  BadgeCheck,
} from 'lucide-react'

const POPULAR_SERVICES = [
  { name: 'Temizlik', cat: 'ev_yasam', Icon: Droplet, circle: 'bg-amber-100', iconClass: 'text-amber-700' },
  { name: 'Boya & Badana', cat: 'ev_yasam', Icon: Paintbrush, circle: 'bg-violet-100', iconClass: 'text-violet-700' },
  { name: 'Tesisat', cat: 'ev_yasam', Icon: Wrench, circle: 'bg-sky-100', iconClass: 'text-sky-700' },
  { name: 'Araç Yardım', cat: 'arac_yol', Icon: Car, circle: 'bg-orange-100', iconClass: 'text-orange-700' },
  { name: 'Elektrik', cat: 'ev_yasam', Icon: Zap, circle: 'bg-yellow-100', iconClass: 'text-yellow-700' },
  { name: 'Güzellik', cat: 'guzellik', Icon: Scissors, circle: 'bg-pink-100', iconClass: 'text-pink-700' },
]

/** Aksiyon kartları — ortak kabuk */
const actionCardBase =
  'group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl p-6 sm:p-7 transition-all duration-300 sm:min-h-[232px]'
const actionCardShadow =
  'shadow-[0_8px_32px_-14px_rgba(15,23,42,0.14)] hover:shadow-[0_20px_44px_-18px_rgba(15,23,42,0.18)] hover:-translate-y-0.5'

type VitrinService = {
  id: string
  title: string
  price: number
  image_url: string | null
  provider_id: string
  provider_name: string
  provider_rating: number | null
  provider_face_verified?: boolean
  category_name?: string
}

export default function CustomerHome() {
  const router = useRouter()
  const { profile } = useCustomerAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [vitrinList, setVitrinList] = useState<VitrinService[]>([])
  const [offerCount, setOfferCount] = useState(0)
  const [activeJob, setActiveJob] = useState<{ title: string; provider?: string } | null>(null)

  const displayName = profile?.full_name?.trim()
    ? profile.full_name.trim().split(/\s+/)[0]
    : ''

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, status, provider_id')
        .eq('customer_id', user.id)
        .in('status', ['open', 'offered', 'accepted', 'started'])
        .order('created_at', { ascending: false })
        .limit(1)
      if (jobs?.[0]) {
        const j = jobs[0]
        const { data: offerRows } = await supabase.from('offers').select('id').eq('job_id', j.id).eq('status', 'pending')
        setOfferCount(offerRows?.length ?? 0)
        let providerName: string | undefined
        if (j.provider_id) {
          const { data: prov } = await supabase.from('profiles_public').select('full_name').eq('id', j.provider_id).single()
          providerName = (prov as { full_name?: string } | null)?.full_name || undefined
        }
        setActiveJob({ title: j.title, provider: providerName })
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadVitrin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let query = supabase
        .from('provider_services')
        .select('id, title, price, image_url, provider_id, city')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(9)
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('city').eq('id', user.id).single()
        const userCity = profile?.city?.trim()
        if (userCity) {
          query = query.or(`city.eq."${userCity}",city.eq."Türkiye Geneli"`)
        }
      }
      const { data: rows } = await query
      if (!rows?.length) {
        setVitrinList([])
        return
      }
      const providerIds = Array.from(new Set(rows.map((r: { provider_id: string }) => r.provider_id)))
      const { data: profiles } = await supabase.from('profiles_public').select('id, full_name, face_verified').in('id', providerIds)
      const { data: pp } = await supabase.from('provider_profiles').select('id, rating').in('id', providerIds)
      const nameBy: Record<string, string> = {}
      const ratingBy: Record<string, number> = {}
      const faceVerifiedBy: Record<string, boolean> = {}
      for (const x of profiles || []) {
        nameBy[x.id] = x.full_name || 'Uzman'
        faceVerifiedBy[x.id] = !!(x as { face_verified?: boolean }).face_verified
      }
      for (const x of pp || []) ratingBy[x.id] = Number(x.rating) || 0
      setVitrinList(
        rows.map((r: { id: string; title: string; price: number; image_url: string | null; provider_id: string }) => ({
          id: r.id,
          title: r.title,
          price: r.price,
          image_url: r.image_url,
          provider_id: r.provider_id,
          provider_name: nameBy[r.provider_id] || 'Uzman',
          provider_rating: ratingBy[r.provider_id] ?? null,
          provider_face_verified: faceVerifiedBy[r.provider_id],
        }))
      )
    }
    loadVitrin()
  }, [])

  const handleSearch = () => {
    const q = searchQuery.trim()
    if (q) router.push(`/customer/providers?q=${encodeURIComponent(q)}`)
    else router.push('/customer/providers')
  }

  return (
    <>
    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-12">
      <div className="flex flex-col gap-8 sm:gap-9 md:gap-10">
        {/* Header – hero + arama */}
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-[2.35rem] md:leading-[1.15]">
              Bugün neyi <span className="font-semibold text-blue-600">çözüyoruz</span>
              {displayName ? <> {displayName}</> : null}?
            </h2>
            <p className="mt-2.5 text-base text-slate-500 sm:mt-3 sm:text-lg">
              Binlerce onaylı uzman, teklif vermek için seni bekliyor.
            </p>
          </div>
          <div
            className={`relative w-full shrink-0 transition-[max-width] duration-300 ease-out md:ml-auto ${
              searchFocused ? 'md:max-w-[34rem]' : 'md:max-w-[28rem]'
            }`}
          >
            <div
              className={`group relative rounded-2xl bg-white/95 p-1 shadow-[0_6px_28px_-10px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 transition-all duration-300 focus-within:shadow-[0_14px_44px_-14px_rgba(59,130,246,0.22)] focus-within:ring-blue-200/90 ${
                searchFocused ? 'ring-blue-200/70' : ''
              }`}
            >
              <Search
                className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500"
                strokeWidth={2.25}
                aria-hidden
              />
              <input
                type="text"
                className="w-full rounded-xl border-0 bg-transparent py-3.5 pl-12 pr-[5.5rem] text-base text-slate-900 outline-none placeholder:text-slate-400 sm:py-4 sm:text-[1.05rem]"
                placeholder="Hizmet veya usta ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                aria-label="Hizmet veya usta ara"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="absolute inset-y-1.5 right-1.5 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98]"
              >
                Bul
              </button>
            </div>
          </div>
        </header>

        {/* Aksiyon kartları — aynı dil: rounded-3xl, tutarlı gölge */}
        <section className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
          <Link
            href="/customer/new-job"
            className={`group ${actionCardBase} ${actionCardShadow} cursor-pointer border border-slate-800/80 bg-slate-900 text-white md:col-span-2 lg:col-span-2`}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
                backgroundSize: '28px 28px',
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"
              aria-hidden
            />
            <div className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <Sparkles className="h-7 w-7 text-white" strokeWidth={2} />
            </div>
            <div className="relative z-10 flex flex-1 flex-col">
              <h3 className="text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
                Hizmet Talebi Oluştur
              </h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-slate-300">
                İhtiyacını detaylıca yaz, uzmanlardan anında fiyat teklifi al.
              </p>
              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-white/85 transition-colors group-hover:text-white">
                Hemen Başla <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => router.push('/customer/live-support')}
            className={`group ${actionCardBase} ${actionCardShadow} border border-orange-200/30 text-left md:col-span-1 lg:col-span-1 bg-gradient-to-br from-amber-300/95 via-orange-300/90 to-rose-300/85`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/[0.12] to-transparent" aria-hidden />
            <div className="absolute right-5 top-5 z-10 sm:right-6 sm:top-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/35 px-3 py-1.5 text-xs font-semibold text-slate-900/90 shadow-sm ring-1 ring-white/50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </span>
                Canlı
              </span>
            </div>
            <div className="relative z-10 mt-10 flex flex-1 flex-col sm:mt-8">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[1.35rem]">
                Canlı Uzman Desteği
              </h3>
              <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-slate-800/85">
                Anında video bağlantısı. Uzman teşhis koyar, 150₺ danışmanlık ücreti.
              </p>
            </div>
            <div className="relative z-10 mt-5 flex sm:mt-6">
              <span className="inline-flex items-center justify-center rounded-2xl bg-white/90 px-5 py-3 text-sm font-bold text-slate-900 shadow-md ring-1 ring-white/80 transition-all group-hover:bg-white">
                Hemen Bağlan <ArrowRight className="ml-1 h-4 w-4" strokeWidth={2.25} />
              </span>
            </div>
          </button>

          <Link
            href="/customer/jobs"
            className={`group ${actionCardBase} ${actionCardShadow} border border-slate-200/90 bg-white md:col-span-1 lg:col-span-1`}
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Aktif süreç</span>
            </div>
            <div className="flex flex-1 flex-col">
              <h4 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {activeJob?.title || 'Aktif işlerim'}
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {activeJob?.provider ? `${activeJob.provider} yolda.` : 'Devam eden işlerini görüntüle.'}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-all group-hover:gap-2.5">
                İncele <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </div>
            </div>
          </Link>

          <Link
            href="/customer/jobs"
            className={`group ${actionCardBase} ${actionCardShadow} border border-blue-200/70 bg-gradient-to-br from-blue-50/95 to-indigo-50/80 md:col-span-3 lg:col-span-1`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100">
              <MessageCircle className="h-6 w-6 text-blue-600" strokeWidth={2.25} />
            </div>
            <div className="flex flex-1 flex-col">
              <h4 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {offerCount > 0 ? `${offerCount} Yeni Teklif` : 'Teklifler'}
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {offerCount > 0 ? 'Talebin için yeni fiyatlar geldi.' : 'Gelen teklifleri incele.'}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition-all group-hover:gap-2.5">
                İncele <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </div>
            </div>
          </Link>
        </section>

        {/* Popüler Hizmetler */}
        <section>
          <h3 className="mb-5 text-xl font-bold tracking-tight text-slate-900 sm:mb-6 sm:text-2xl">
            Popüler Hizmetler
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {POPULAR_SERVICES.map((item) => {
              const Icon = item.Icon
              return (
                <Link
                  key={item.name}
                  href={`/customer/new-job?cat=${item.cat}`}
                  className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100/90 bg-white p-5 shadow-[0_4px_24px_-16px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_36px_-16px_rgba(15,23,42,0.14)] sm:p-6"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-105 sm:h-[3.75rem] sm:w-[3.75rem] ${item.circle}`}
                  >
                    <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${item.iconClass}`} strokeWidth={2.35} />
                  </div>
                  <span className="text-center text-sm font-semibold text-slate-800">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Uzman İlanları */}
        <section>
          <div className="mb-5 sm:mb-6">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Uzman İlanları</h3>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">
              Hemen çağırabileceğin, fiyatı belli hazır hizmetler.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-6">
            {vitrinList.map((s) => (
              <Link
                key={s.id}
                href={`/customer/services/${s.id}`}
                className="group relative flex min-h-[280px] cursor-pointer flex-col rounded-3xl border border-slate-100/90 bg-white p-5 shadow-[0_6px_32px_-14px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-18px_rgba(15,23,42,0.16)] sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-100/80">
                    Hizmet
                  </span>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Fiyat</p>
                    <p className="text-xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-2xl">
                      ₺{Number(s.price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                <h4 className="mt-4 text-lg font-bold leading-snug text-slate-900 sm:text-xl">{s.title}</h4>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                    <span className="text-sm font-semibold tabular-nums text-slate-800">
                      {s.provider_rating != null ? s.provider_rating.toFixed(1) : '—'}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-400">Uzman puanı</span>
                </div>

                <div className="mt-4 flex flex-1 items-center gap-3 rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100/80">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-lg shadow-inner">
                    👨‍🔧
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="truncate">{s.provider_name}</span>
                      {s.provider_face_verified && (
                        <span
                          className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-blue-500/30"
                          title="Onaylı uzman"
                        >
                          <BadgeCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                          Onaylı
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-1 flex-col justify-end border-t border-slate-100/90 pt-4">
                  <div className="flex justify-end">
                    <span className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-slate-900/15 ring-1 ring-slate-800 transition-all group-hover:bg-slate-800 group-hover:shadow-lg">
                      Hemen Çağır
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>

    {/* Footer — hafif gri, sütunlu */}
    <footer className="mt-12 w-full border-t border-slate-200/90 bg-slate-100/80 py-10 sm:mt-14 sm:py-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4 md:gap-10 lg:gap-12">
        <div className="col-span-2 md:col-span-1">
          <h2 className="mb-3 text-xl font-bold tracking-tight text-slate-900">
            GELSİN<span className="text-blue-600">.</span>
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-slate-500">
            Türkiye&apos;nin güvenilir hizmet platformu.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Keşfet</h4>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>
              <Link href="/customer" className="transition-colors hover:text-slate-900">
                Ana sayfa
              </Link>
            </li>
            <li>
              <Link href="/customer/providers" className="transition-colors hover:text-slate-900">
                Uzmanlar
              </Link>
            </li>
            <li>
              <Link href="/customer/new-job" className="transition-colors hover:text-slate-900">
                İş talebi
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Gelsin</h4>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>
              <Link href="/customer" className="transition-colors hover:text-slate-900">
                Hakkımızda
              </Link>
            </li>
            <li>
              <Link href="/customer" className="transition-colors hover:text-slate-900">
                Nasıl çalışır?
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Destek</h4>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>
              <Link href="/customer/support" className="transition-colors hover:text-slate-900">
                Yardım merkezi
              </Link>
            </li>
            <li>
              <Link href="/customer/support" className="transition-colors hover:text-slate-900">
                İletişim
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
    </>
  )
}
