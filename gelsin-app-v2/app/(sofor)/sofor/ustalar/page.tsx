'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, RefreshCw, MapPin } from 'lucide-react'

type JobRow = {
  id: string
  title: string
  description: string | null
  address: string
  status: string
  created_at: string
}

type Meta = { vehicle?: string; transmission?: string; duration?: string; service?: string; pickup?: string; dropoff?: string }

export default function SoforUstalarPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [approved, setApproved] = useState(false)
  const [name, setName] = useState<string>('')
  const [isAvailable, setIsAvailable] = useState<boolean>(false)

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({})
  const [userId, setUserId] = useState<string | null>(null)

  const [offerModalJob, setOfferModalJob] = useState<JobRow | null>(null)
  const [priceTl, setPriceTl] = useState('')
  const [availability, setAvailability] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const parsedMetaByJobId = useMemo(() => {
    const map: Record<string, Meta> = {}
    for (const j of jobs) {
      const text = (j.description || '').toLowerCase()
      map[j.id] = {
        vehicle: pickOne(text, ['sedan', 'suv', 'minibus', 'kamyonet']),
        transmission: pickOne(text, ['manuel', 'otomatik']),
        duration: pickDuration(text),
        service: text.includes('tek yön') ? 'Tek Yön' : text.includes('saatlik') ? 'Saatlik/Günlük' : undefined,
        pickup: extractLine(j.description, 'Alınacak:') || undefined,
        dropoff: extractLine(j.description, 'Bırakılacak:') || undefined,
      }
    }
    return map
  }, [jobs])

  const init = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login?redirect=/sofor/ustalar')
      return
    }
    const uid = session.user.id
    setUserId(uid)

    const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', uid).single()
    setName(String(prof?.full_name || '').trim())

    const { data: pp } = await supabase.from('provider_profiles').select('status, is_online').eq('id', uid).single()
    setApproved(pp?.status === 'approved')
    setIsAvailable(!!pp?.is_online)

    setAuthChecked(true)
  }

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login?redirect=/sofor/ustalar')
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
      const { data: offerRows } = await supabase.from('offers').select('id, job_id').in('job_id', ids)
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
    init().then(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleAvailability = async () => {
    if (!userId) return
    const next = !isAvailable
    setIsAvailable(next)
    const supabase = createClient()
    const { error } = await supabase
      .from('provider_profiles')
      .update({ is_online: next } as any)
      .eq('id', userId)
    if (error) {
      setIsAvailable(!next)
      alert(error.message)
    }
  }

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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 pb-28">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">Şoför Panel</p>
            <p className="text-base font-bold truncate">Merhaba {name || 'Usta'}</p>
          </div>
          <button
            type="button"
            onClick={toggleAvailability}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
              isAvailable
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-indigo-900/80 text-slate-200 border-indigo-800'
            }`}
            title="provider_profiles.is_online güncellenir"
          >
            {isAvailable ? 'İş alabilirim' : 'Müsait değilim'}
          </button>
        </header>

        {!approved && (
          <div className="rounded-2xl border border-indigo-800 bg-indigo-900/30 p-4 text-sm text-slate-300">
            Hesabın henüz onaylı değil. Onay sonrası ilanlar burada görünecek.
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-amber-400">Açık İlanlar</h1>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-900/80 text-slate-200 hover:bg-indigo-800 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

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
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {meta.service && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {meta.service}
                          </span>
                        )}
                        {(meta.vehicle || meta.transmission) && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-800 text-slate-200 border border-indigo-700">
                            {(meta.vehicle || 'Araç').toUpperCase()} · {(meta.transmission || 'Vites').toUpperCase()}
                          </span>
                        )}
                        {meta.duration && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-800 text-slate-200 border border-indigo-700">
                            Süre: {meta.duration}
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
                      className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 text-slate-900 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50"
                      disabled={!approved}
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

      {/* Alt nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-indigo-950/90 backdrop-blur border-t border-indigo-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-around text-xs font-semibold">
          <a href="/sofor/ustalar" className="text-amber-400">🏠 İlanlar</a>
          <a href="/sofor/ilanlar" className="text-slate-200">📋 Tekliflerim</a>
          <a href="/sofor/profil" className="text-slate-200">👤 Profil</a>
        </div>
      </nav>

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
                <label className="block text-xs text-slate-400 mb-1">Fiyat (TL)</label>
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
  const m = text.match(/süre:\s*([^\n]+)/i)
  if (m?.[1]) return m[1].trim()
  const m2 = text.match(/\b(\d+)\s*saat\b/i)
  if (m2?.[1]) return `${m2[1]} saat`
  if (text.includes('tam gün')) return 'Tam Gün'
  return undefined
}

function extractLine(desc: string | null, prefix: string): string | null {
  if (!desc) return null
  const lines = desc.split('\n')
  const line = lines.find((l) => l.trim().startsWith(prefix))
  if (!line) return null
  return line.replace(prefix, '').trim() || null
}

