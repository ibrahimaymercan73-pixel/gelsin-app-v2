'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, RefreshCw, Navigation } from 'lucide-react'

type OfferRow = {
  id: string
  job_id: string
  provider_id: string
  price: number
  status: 'pending' | 'accepted' | 'rejected' | string
  estimated_duration: string | null
  message: string | null
  created_at: string
  jobs?: {
    id: string
    title: string
    description: string | null
    address: string
    lat: number | null
    lng: number | null
    status: string
    customer_id: string
  } | null
}

function badgeClass(s: string) {
  if (s === 'accepted') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (s === 'rejected') return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
}

function badgeLabel(s: string) {
  if (s === 'accepted') return 'Kabul Edildi'
  if (s === 'rejected') return 'Reddedildi'
  return 'Bekliyor'
}

function mapsUrl(job: OfferRow['jobs']) {
  if (!job) return null
  if (typeof job.lat === 'number' && typeof job.lng === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`
  }
  if (job.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`
  }
  return null
}

export default function CekiciTekliflerimPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Record<string, { phone: string | null; full_name: string | null }>>({})
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login?redirect=/cekici/ustalar/tekliflerim')
      return
    }
    setUserId(user.id)

    const { data, error } = await supabase
      .from('offers')
      .select('id, job_id, provider_id, price, status, estimated_duration, message, created_at, jobs(id, title, description, address, lat, lng, status, customer_id)')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setOffers([])
      setLoading(false)
      return
    }

    const list = (data || []) as any as OfferRow[]
    setOffers(list)

    // Kabul edilenler için müşteri telefonu (RLS: rpc kontrol eder)
    const accepted = list.filter((o) => o.status === 'accepted' && o.jobs?.id).slice(0, 30)
    const nextContacts: Record<string, { phone: string | null; full_name: string | null }> = {}
    for (const o of accepted) {
      const jobId = o.jobs!.id
      if (contacts[jobId]) continue
      const { data: rpc } = await supabase.rpc('get_counterpart_contact', { p_job_id: jobId })
      const row = Array.isArray(rpc) && rpc[0] ? (rpc[0] as any) : null
      nextContacts[jobId] = { phone: row?.phone ?? null, full_name: row?.full_name ?? null }
    }
    if (Object.keys(nextContacts).length) {
      setContacts((prev) => ({ ...prev, ...nextContacts }))
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completeJob = async (jobId: string) => {
    if (!userId) return
    setUpdatingJobId(jobId)
    try {
      const res = await fetch('/api/qr/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, action: 'end' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error || 'İş tamamlanamadı.')
        setUpdatingJobId(null)
        return
      }
      await load()
      alert('İş tamamlandı ve ödeme süreci başlatıldı.')
    } catch (e: any) {
      alert(e?.message || 'Güncellenemedi.')
    } finally {
      setUpdatingJobId(null)
    }
  }

  const empty = !loading && offers.length === 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">Çekici</p>
            <h1 className="text-lg font-bold">Tekliflerim</h1>
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
        ) : empty ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center space-y-2">
            <p className="text-slate-300 font-semibold">Henüz teklif vermedin.</p>
            <a
              href="/cekici/ustalar"
              className="inline-flex justify-center w-full py-3 rounded-2xl bg-orange-500 text-white font-semibold"
            >
              İlanlara git
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {offers.map((o) => {
              const job = o.jobs || null
              const status = String(o.status || 'pending')
              const jobTitle = job?.title || 'İş'
              const jobNote = job?.description ? String(job.description) : ''
              const label = `${jobTitle}${jobNote ? ' · ' + jobNote : ''}`
              const contact = job?.id ? contacts[job.id] : null
              const nav = mapsUrl(job)
              const canComplete = status === 'accepted' && job?.status && job.status !== 'completed'

              return (
                <li key={o.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeClass(status)}`}>
                          {badgeLabel(status)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {o.created_at ? new Date(o.created_at).toLocaleString('tr-TR') : ''}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 line-clamp-2 whitespace-pre-line">{label}</p>
                      {o.message && <p className="text-xs text-slate-400 italic">&quot;{o.message}&quot;</p>}
                      {o.estimated_duration && (
                        <p className="text-xs text-slate-500">⏱ {o.estimated_duration}</p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-orange-400">₺{o.price}</p>
                  </div>

                  {status === 'accepted' && (
                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 space-y-2">
                      <p className="text-xs text-slate-400">
                        Müşteri: <span className="font-semibold text-slate-200">{contact?.full_name || '—'}</span>
                      </p>
                      {contact?.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-sm font-semibold"
                        >
                          📞 {contact.phone}
                        </a>
                      ) : (
                        <p className="text-xs text-slate-500">Telefon: —</p>
                      )}
                      {nav && (
                        <a
                          href={nav}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-semibold"
                        >
                          <Navigation className="w-4 h-4" /> Navigasyon
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => job?.id && completeJob(job.id)}
                        disabled={!canComplete || updatingJobId === job?.id}
                        className="w-full mt-2 py-2.5 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        {updatingJobId === job?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        İş Tamamlandı
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur border-t border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-around text-xs font-semibold">
          <a href="/cekici/ustalar" className="text-slate-300">🏠 İlanlar</a>
          <a href="/cekici/ustalar/tekliflerim" className="text-orange-400">📋 Tekliflerim</a>
          <a href="/cekici/ustalar/profil" className="text-slate-300">👤 Profil</a>
        </div>
      </nav>
    </div>
  )
}

