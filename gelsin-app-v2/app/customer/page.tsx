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
  { name: 'Temizlik', cat: 'ev_yasam', Icon: Droplet, circle: 'bg-amber-50', iconClass: 'text-amber-600' },
  { name: 'Boya & Badana', cat: 'ev_yasam', Icon: Paintbrush, circle: 'bg-violet-50', iconClass: 'text-violet-600' },
  { name: 'Tesisat', cat: 'ev_yasam', Icon: Wrench, circle: 'bg-sky-50', iconClass: 'text-sky-600' },
  { name: 'Araç Yardım', cat: 'arac_yol', Icon: Car, circle: 'bg-orange-50', iconClass: 'text-orange-600' },
  { name: 'Elektrik', cat: 'ev_yasam', Icon: Zap, circle: 'bg-yellow-50', iconClass: 'text-yellow-600' },
  { name: 'Güzellik', cat: 'guzellik', Icon: Scissors, circle: 'bg-pink-50', iconClass: 'text-pink-600' },
]

const actionCardShell =
  'group flex min-h-[188px] flex-col justify-between rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-sm sm:min-h-[200px] sm:p-6'

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
    <div className="w-full bg-white">
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="flex flex-col gap-12 md:gap-14">
        {/* Header – hero + arama */}
        <header className="flex flex-col justify-between gap-8 pt-2 md:flex-row md:items-end md:gap-10">
          <div className="min-w-0 max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Bugün neyi <span className="text-blue-600">çözüyoruz</span>
              {displayName ? <> {displayName}</> : null}?
            </h2>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">
              Onaylı uzmanlardan teklif al.
            </p>
          </div>
          <div className="relative w-full shrink-0 md:max-w-md md:ml-auto">
            <div className="relative flex items-center rounded-lg border border-slate-200 bg-white py-1 pl-3 pr-1 shadow-sm focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100">
              <Search className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
              <input
                type="text"
                className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-2 pr-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Hizmet veya usta ara"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                aria-label="Hizmet veya usta ara"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="shrink-0 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Bul
              </button>
            </div>
          </div>
        </header>

        {/* Aksiyon kartları — beyaz, shadow-sm; sadece talep kartı koyu */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          <Link
            href="/customer/new-job"
            className={`${actionCardShell} border-slate-800 bg-slate-950 text-white md:col-span-2 lg:col-span-2`}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
              <Sparkles className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-1 flex-col">
              <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Hizmet talebi oluştur
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
                İhtiyacını yaz, uzmanlardan teklif al.
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-white">
                Başla <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => router.push('/customer/live-support')}
            className={`group text-left ${actionCardShell} border-orange-100/60 bg-orange-50/40 md:col-span-1 lg:col-span-1`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">Video görüşme</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Canlı
              </span>
            </div>
            <div className="flex flex-1 flex-col">
              <h3 className="text-lg font-semibold text-slate-900">Canlı uzman desteği</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Uzman bağlantısı, 150₺ danışmanlık.
              </p>
            </div>
            <span className="mt-4 inline-flex w-fit items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-orange-600">
              Bağlan
            </span>
          </button>

          <Link href="/customer/jobs" className={`group ${actionCardShell} md:col-span-1 lg:col-span-1`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-500">Aktif</span>
            </div>
            <h4 className="text-lg font-semibold text-slate-900">
              {activeJob?.title || 'İşlerim'}
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              {activeJob?.provider ? `${activeJob.provider} yolda.` : 'Devam eden işler.'}
            </p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600">
              Aç <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </div>
          </Link>

          <Link href="/customer/jobs" className={`group ${actionCardShell} md:col-span-3 lg:col-span-1`}>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
              <MessageCircle className="h-4 w-4 text-blue-600" strokeWidth={2} />
            </div>
            <h4 className="text-lg font-semibold text-slate-900">
              {offerCount > 0 ? `${offerCount} yeni teklif` : 'Teklifler'}
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              {offerCount > 0 ? 'Yeni fiyatları gör.' : 'Gelen teklifler.'}
            </p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600">
              Aç <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </div>
          </Link>
        </section>

        {/* Popüler Hizmetler */}
        <section>
          <h3 className="mb-6 text-lg font-semibold text-slate-900">Popüler hizmetler</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {POPULAR_SERVICES.map((item) => {
              const Icon = item.Icon
              return (
                <Link
                  key={item.name}
                  href={`/customer/new-job?cat=${item.cat}`}
                  className="flex flex-col items-center gap-2 rounded-lg border border-slate-100 bg-white py-3 shadow-sm transition-colors hover:border-slate-200"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${item.circle}`}
                  >
                    <Icon className={`h-4 w-4 ${item.iconClass}`} strokeWidth={2.25} />
                  </div>
                  <span className="px-1 text-center text-[11px] font-medium leading-tight text-slate-700 sm:text-xs">
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Uzman İlanları */}
        <section>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Uzman ilanları</h3>
            <p className="mt-1 text-sm text-slate-500">Fiyatı net, hemen talep edebileceğin hizmetler.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vitrinList.map((s) => (
              <Link
                key={s.id}
                href={`/customer/services/${s.id}`}
                className="group flex flex-col rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-slate-400">Hizmet</span>
                  <p className="text-right text-lg font-semibold tabular-nums text-slate-900">
                    ₺{Number(s.price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <h4 className="mt-3 text-base font-semibold leading-snug text-slate-900">{s.title}</h4>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                  <span className="tabular-nums font-medium">
                    {s.provider_rating != null ? s.provider_rating.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base">
                    👨‍🔧
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{s.provider_name}</p>
                    {s.provider_face_verified && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-600">
                        <BadgeCheck className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
                        Onaylı uzman
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <span className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white group-hover:bg-blue-700">
                    Hemen çağır
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
    </div>

    <footer className="mt-0 w-full border-t border-slate-200 bg-white py-10 sm:py-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-8 px-4 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <p className="text-base font-semibold text-slate-900">
            GELSİN<span className="text-blue-600">.</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-slate-500">Güvenilir hizmet platformu.</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">Keşfet</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/customer" className="hover:text-slate-900">
                Ana sayfa
              </Link>
            </li>
            <li>
              <Link href="/customer/providers" className="hover:text-slate-900">
                Uzmanlar
              </Link>
            </li>
            <li>
              <Link href="/customer/new-job" className="hover:text-slate-900">
                İş talebi
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">Gelsin</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/customer" className="hover:text-slate-900">
                Hakkımızda
              </Link>
            </li>
            <li>
              <Link href="/customer" className="hover:text-slate-900">
                Nasıl çalışır?
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">Destek</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/customer/support" className="hover:text-slate-900">
                Yardım
              </Link>
            </li>
            <li>
              <Link href="/customer/support" className="hover:text-slate-900">
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
