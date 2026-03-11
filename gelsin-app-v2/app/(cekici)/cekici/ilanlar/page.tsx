'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, MapPin, RefreshCw } from 'lucide-react'

type JobRow = {
  id: string
  title: string
  description: string | null
  address: string
  status: string
  created_at: string
  images: string[] | null
  media_urls?: string[] | null
}

export default function CekiciIlanlarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({})
  const [userId, setUserId] = useState<string | null>(null)

  const [offerModalJob, setOfferModalJob] = useState<JobRow | null>(null)
  const [priceTl, setPriceTl] = useState('')
  const [minutes, setMinutes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const mediaByJobId = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const j of jobs) {
      const imgs = Array.isArray(j.images) ? j.images : []
      const media = Array.isArray((j as any).media_urls) ? ((j as any).media_urls as string[]) : []
      map[j.id] = [...imgs, ...media].filter(Boolean)
    }
    return map
  }, [jobs])

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    setUserId(user.id)

    // jobs.service_type her ortamda olmayabilir; önce deneyip hata olursa fallback kullanıyoruz.
    let jrows: any[] | null = null
    let err: any = null
    const q1 = await supabase
      .from('jobs')
      .select('id, title, description, address, status, created_at, images, media_urls')
      .eq('status', 'open')
      .eq('service_type', 'cekici')
      .order('created_at', { ascending: false })
    jrows = q1.data as any[] | null
    err = q1.error

    if (err) {
      const q2 = await supabase
        .from('jobs')
        .select('id, title, description, address, status, created_at, images, media_urls')
        .eq('status', 'open')
        .ilike('title', '%çekici%')
        .order('created_at', { ascending: false })
      jrows = q2.data as any[] | null
    }

    const list = (jrows || []).map((r) => ({
      id: String(r.id),
      title: String(r.title || 'İlan'),
      description: typeof r.description === 'string' ? r.description : null,
      address: String(r.address || ''),
      status: String(r.status || 'open'),
      created_at: String(r.created_at || ''),
      images: Array.isArray(r.images) ? (r.images as string[]) : null,
      media_urls: Array.isArray(r.media_urls) ? (r.media_urls as string[]) : null,
    })) as JobRow[]

    setJobs(list)

    if (list.length > 0) {
      const ids = list.map((x) => x.id)
      const { data: offerRows } = await supabase
        .from('offers')
        .select('id, job_id')
        .in('job_id', ids)
      const counts: Record<string, number> = {}
      for (const o of offerRows || []) {
        const jobId = String((o as any).job_id)
        counts[jobId] = (counts[jobId] || 0) + 1
      }
      setOfferCounts(counts)
    } else {
      setOfferCounts({})
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitOffer = async () => {
    if (!offerModalJob) return
    const p = Number(String(priceTl).replace(',', '.'))
    const m = Number(String(minutes).replace(',', '.'))
    if (!Number.isFinite(p) || p <= 0) return alert('Geçerli bir tutar girin.')
    if (!Number.isFinite(m) || m <= 0) return alert('Geçerli bir dakika girin.')
    if (!userId) return

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('offers')
        .select('id')
        .eq('job_id', offerModalJob.id)
        .eq('provider_id', userId)

      if (existing && existing.length > 0) {
        alert('Bu ilana zaten teklif verdiniz.')
        return
      }

      const { error } = await supabase.from('offers').insert({
        job_id: offerModalJob.id,
        provider_id: userId,
        price: p,
        estimated_duration: `${m} dk`,
        message: `⏱ ${m} dakikada oradayım`,
      })

      if (error) throw error
      setOfferModalJob(null)
      setPriceTl('')
      setMinutes('')
      await load()
      alert('Teklif gönderildi.')
    } catch (e: any) {
      alert(e?.message || 'Teklif gönderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">Çekici</p>
            <h1 className="text-lg font-bold">Açık İlanlar</h1>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center space-y-2">
            <p className="text-slate-300 font-semibold">Şu an açık ilan yok.</p>
            <p className="text-sm text-slate-500">Yeni ilanlar düştüğünde burada görünecek.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => {
              const medias = mediaByJobId[j.id] || []
              return (
                <li key={j.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{j.title}</p>
                      {j.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 whitespace-pre-line">
                          {j.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        {j.address}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
                          {offerCounts[j.id] || 0} teklif
                        </span>
                        <span>{j.created_at ? new Date(j.created_at).toLocaleString('tr-TR') : ''}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOfferModalJob(j)}
                      className="shrink-0 px-3 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
                    >
                      Teklif Ver
                    </button>
                  </div>

                  {medias.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {medias.slice(0, 6).map((url, i) => (
                        <div key={i} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {offerModalJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-950 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-100 text-sm">Teklif Ver</p>
              <button
                type="button"
                onClick={() => setOfferModalJob(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{offerModalJob.title}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tutar (TL)</label>
                <input
                  value={priceTl}
                  onChange={(e) => setPriceTl(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  placeholder="1500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Kaç dakikada?</label>
                <input
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  placeholder="20"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={submitOffer}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Teklifi Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

