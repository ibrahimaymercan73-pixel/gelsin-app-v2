'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Sparkles, MessageCircle, Search, ArrowRight, Droplet, Paintbrush, Wrench, Car, Zap, Scissors } from 'lucide-react'

const POPULAR_SERVICES = [
  { name: 'Temizlik', cat: 'ev_yasam', Icon: Droplet },
  { name: 'Boya & Badana', cat: 'ev_yasam', Icon: Paintbrush },
  { name: 'Tesisat', cat: 'ev_yasam', Icon: Wrench },
  { name: 'Araç Yardım', cat: 'arac_yol', Icon: Car },
  { name: 'Elektrik', cat: 'ev_yasam', Icon: Zap },
  { name: 'Güzellik', cat: 'guzellik', Icon: Scissors },
]

type VitrinService = {
  id: string
  title: string
  price: number
  image_url: string | null
  provider_id: string
  provider_name: string
  provider_rating: number | null
  category_name?: string
}

export default function CustomerHome() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [vitrinList, setVitrinList] = useState<VitrinService[]>([])
  const [offerCount, setOfferCount] = useState(0)
  const [activeJob, setActiveJob] = useState<{ title: string; provider?: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(p?.full_name?.trim() || '')
      const first = (p?.full_name?.trim() || '').split(/\s+/)[0] || ''

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, status, provider_id')
        .eq('customer_id', user.id)
        .in('status', ['open', 'offered', 'accepted', 'started'])
        .order('created_at', { ascending: false })
        .limit(1)
      if (jobs?.[0]) {
        const j = jobs[0]
        const { data: offerRows } = await supabase.from('job_offers').select('id').eq('job_id', j.id).eq('status', 'pending')
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
      const { data: rows } = await supabase
        .from('provider_services')
        .select('id, title, price, image_url, provider_id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(9)
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
        rows.map((r: { id: string; title: string; price: number; image_url: string | null; provider_id: string }) => ({
          id: r.id,
          title: r.title,
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
    const q = searchQuery.trim()
    if (q) router.push(`/customer/providers?q=${encodeURIComponent(q)}`)
    else router.push('/customer/providers')
  }

  const displayName = userName.trim() ? userName.trim().split(/\s+/)[0] : 'Misafir'

  return (
    <>
    <div className="max-w-7xl mx-auto px-6 pb-12">
      <div className="flex flex-col gap-10">
        {/* Header – hero + arama */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Bugün neyi <span className="text-blue-600">çözüyoruz</span> {displayName}?
            </h2>
            <p className="text-slate-500 mt-3 text-lg">
              Binlerce onaylı uzman, teklif vermek için seni bekliyor.
            </p>
          </div>
          <div className="relative w-full md:w-[450px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
            <input
              type="text"
              className="w-full bg-white border border-slate-200 shadow-sm text-slate-900 text-lg rounded-2xl pl-12 pr-32 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Hizmet veya usta ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              type="button"
              onClick={handleSearch}
              className="absolute inset-y-2 right-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl px-6 transition-colors shadow-md"
            >
              Bul
            </button>
          </div>
        </header>

        {/* 3 kart: Özel İş Talebi, Aktif Süreç, Yeni Teklif */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <Link
            href="/customer/new-job"
            className="md:col-span-2 lg:col-span-2 bg-slate-900 rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden group cursor-pointer shadow-xl hover:-translate-y-1 transition-transform min-h-[220px]"
          >
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-8">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-white mb-2">Özel İş Talebi Yarat</h3>
              <p className="text-slate-300 text-lg max-w-sm">
                Detayları yaz, uzmanlar sana fiyat teklifi göndersin.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                Hemen Başla <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          <Link
            href="/customer/jobs"
            className="group md:col-span-1 lg:col-span-1 bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow min-h-[220px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-500 uppercase">Aktif Süreç</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xl">
                {activeJob?.title || 'Aktif işlerim'}
              </h4>
              <p className="text-sm text-slate-500 mt-1">
                {activeJob?.provider ? `${activeJob.provider} yolda.` : 'Devam eden işlerini görüntüle.'}
              </p>
              <div className="mt-4 text-sm font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                İncele <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          <Link
            href="/customer/jobs"
            className="group md:col-span-3 lg:col-span-1 bg-blue-50 rounded-[2rem] p-7 border border-blue-100 flex flex-col justify-between cursor-pointer hover:bg-blue-100 transition-colors min-h-[220px]"
          >
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 mb-4">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xl">
                {offerCount > 0 ? `${offerCount} Yeni Teklif` : 'Teklifler'}
              </h4>
              <p className="text-sm text-blue-800 mt-2">
                {offerCount > 0 ? 'Talebin için yeni fiyatlar geldi.' : 'Gelen teklifleri incele.'}
              </p>
              <div className="mt-4 text-sm font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                İncele <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </section>

        {/* Popüler Hizmetler */}
        <section>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Popüler Hizmetler</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {POPULAR_SERVICES.map((item) => {
              const Icon = item.Icon
              return (
                <Link
                  key={item.name}
                  href={`/customer/new-job?cat=${item.cat}`}
                  className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                >
                  <Icon className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="font-semibold text-slate-700 text-sm">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Uzman İlanları */}
        <section>
          <div className="mb-6">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Uzman İlanları</h3>
            <p className="text-slate-500 mt-2 text-lg">Hemen çağırabileceğin, fiyatı belli hazır hizmetler.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vitrinList.map((s) => (
              <Link
                key={s.id}
                href={`/customer/services/${s.id}`}
                className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">
                    Hizmet
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-2xl text-slate-900 leading-tight mb-2">{s.title}</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-slate-700">
                      {s.provider_rating != null ? s.provider_rating.toFixed(1) : '—'}
                    </span>
                    <span className="text-slate-400">(Yorum)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 bg-slate-50 p-3 rounded-2xl">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-xl">
                    👨‍🔧
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{s.provider_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <span className="font-black text-3xl text-slate-900">₺{Number(s.price).toFixed(0)}</span>
                  <span className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                    Hemen Çağır
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>

    {/* Footer – tam genişlik koyu */}
    <footer className="w-full bg-[#0F172A] text-slate-300 py-12 mt-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h2 className="text-2xl font-black text-white mb-4">
            GELSİN<span className="text-blue-500">.</span>
          </h2>
          <p className="text-sm text-slate-400">Türkiye&apos;nin en güvenilir hizmet platformu.</p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Gelsin</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/customer" className="hover:text-white transition-colors">Hakkımızda</Link></li>
            <li><Link href="/customer" className="hover:text-white transition-colors">Nasıl Çalışır?</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Destek</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/customer" className="hover:text-white transition-colors">Yardım Merkezi</Link></li>
            <li><Link href="/customer" className="hover:text-white transition-colors">İletişim</Link></li>
          </ul>
        </div>
      </div>
    </footer>
    </>
  )
}
