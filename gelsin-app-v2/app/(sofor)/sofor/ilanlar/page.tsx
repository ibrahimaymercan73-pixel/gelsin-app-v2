'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, MapPin, RefreshCw, Clock } from 'lucide-react'

type JobRow = {
  id: string
  title: string
  description: string | null
  address: string
  status: string
  created_at: string
}

export default function SoforIlanlarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({})
  const [userId, setUserId] = useState<string | null>(null)

  const [offerModalJob, setOfferModalJob] = useState<JobRow | null>(null)
  const [priceTl, setPriceTl] = useState('')
  const [availability, setAvailability] = useState('') // ör: 18:00-22:00
  const [submitting, setSubmitting] = useState(false)

  const parsedMetaByJobId = useMemo(() => {
    const map: Record<string, { vehicle?: string; transmission?: string; duration?: string; service?: string; pickup?: string; dropoff?: string }> = {}
    for (const j of jobs) {
      const text = (j.description || '').toLowerCase()
      const vehicle = pickOne(text, ['sedan', 'suv', 'minibus', 'kamyonet'])
      const transmission = pickOne(text, ['manuel', 'otomatik'])
      const duration =
        pickDuration(text) ||
        (text.includes('tam gün') ? 'Tam Gün' : undefined)
      const service = text.includes('tek yön') ? 'Tek Yön' : text.includes('saatlik') ? 'Saatlik/Günlük' : undefined
      const pickup = extractLine(j.description, 'Alınacak:') || undefined
      const dropoff = extractLine(j.description, 'Bırakılacak:') || undefined
      map[j.id] = { vehicle, transmission, duration, service, pickup, dropoff }
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

    let jrows: any[] | null = null
    const q1 = await supabase
      .from('jobs')
      .select('id, title, description, address, status, created_at')
      .eq('status', 'open')
      .eq('service_type', 'sofor')
      .order('created_at', { ascending: false })
    jrows = q1.data as any[] | null
    if (q1.error) {
      const q2 = await supabase
        .from('jobs')
        .select('id, title, description, address, status, created_at')
        .eq('status', 'open')
        .ilike('title', '%şoför%')
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
    if (!Number.isFinite(p) || p <= 0) return alert('Geçerli bir tutar girin.')
    if (!availability.trim()) return alert('Müsait saat aralığı girin (ör. 18:00-22:00).')
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
        estimated_duration: availability.trim(),
        message: `🕒 Müsaitlik: ${availability.trim()}`,
      })
      if (error) throw error
      setOfferModalJob(null)
      setPriceTl('')
      setAvailability('')
      await load()
      alert('Teklif gönderildi.')
    } catch (e: any) {
      alert(e?.message || 'Teklif gönderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">Özel Şoför</p>
            <h1 className="text-lg font-bold">Açık İlanlar</h1>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-900/80 text-slate-200 hover:bg-indigo-800 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-indigo-800 bg-indigo-900/30 p-10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-indigo-800 bg-indigo-900/30 p-6 text-center space-y-2">
            <p className="text-slate-300 font-semibold">Şu an açık ilan yok.</p>
            <p className="text-sm text-slate-500">Yeni ilanlar düştüğünde burada görünecek.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => {
              const meta = parsedMetaByJobId[j.id] || {}
              return (
                <li key={j.id} className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{j.title}</p>
                      {j.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 whitespace-pre-line">
                          {j.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {meta.service && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {meta.service}
                          </span>
                        )}
                        {(meta.vehicle || meta.transmission) && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-800 text-slate-200 border border-indigo-700">
                            {meta.vehicle ? meta.vehicle.toUpperCase() : 'ARAÇ'} · {meta.transmission ? meta.transmission.toUpperCase() : 'VİTES'}
                          </span>
                        )}
                        {meta.duration && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-800 text-slate-200 border border-indigo-700 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {meta.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        {meta.pickup && meta.dropoff ? `${meta.pickup} → ${meta.dropoff}` : j.address}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {offerCounts[j.id] || 0} teklif
                        </span>
                        <span>{j.created_at ? new Date(j.created_at).toLocaleString('tr-TR') : ''}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOfferModalJob(j)}
                      className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 text-slate-900 text-sm font-semibold hover:bg-amber-400"
                    >
                      Teklif Ver
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {offerModalJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-indigo-950 border border-indigo-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-100 text-sm">Teklif Ver</p>
              <button
                type="button"
                onClick={() => setOfferModalJob(null)}
                className="w-9 h-9 rounded-xl bg-indigo-900/80 text-slate-200 hover:bg-indigo-800"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{offerModalJob.title}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tutar (TL)</label>
                <input
                  value={priceTl}
                  onChange={(e) => setPriceTl(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  placeholder="1200"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Müsait olduğum saat aralığı</label>
                <input
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  placeholder="18:00-22:00"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={submitOffer}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
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

function pickOne(text: string, keys: string[]): string | undefined {
  for (const k of keys) if (text.includes(k)) return k
  return undefined
}

function pickDuration(text: string): string | undefined {
  const m = text.match(/süre:\\s*(\\d+\\s*saat|tam\\s*gün)/i)
  if (m?.[1]) return m[1].replace('saat', 'saat').replace('tam gün', 'Tam Gün')
  const m2 = text.match(/\\b(\\d+)\\s*saat\\b/i)
  if (m2?.[1]) return `${m2[1]} saat`
  return undefined
}

function extractLine(desc: string | null, prefix: string): string | null {
  if (!desc) return null
  const lines = desc.split('\\n')
  const line = lines.find((l) => l.trim().startsWith(prefix))
  if (!line) return null
  return line.replace(prefix, '').trim() || null
}

