'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type OfferRow = {
  id: string
  price: number | null
  status: string | null
  eta_minutes: number | null
  job: {
    id: string
    title: string
    pickup: string
    dropoff: string | null
    customer_phone: string | null
  }
}

export default function CekiciTekliflerimPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      setChecking(false)
      setLoading(true)

      const { data, error } = await supabase
        .from('offers')
        .select(
          `
            id,
            price,
            status,
            eta_minutes,
            jobs (
              id,
              title,
              pickup_location,
              dropoff_location,
              customer_phone
            )
          `
        )
        .eq('provider_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setOffers([])
      } else {
        const rows: OfferRow[] = (data || []).map((o: any) => ({
          id: String(o.id),
          price: o.price ?? null,
          status: o.status ?? null,
          eta_minutes: o.eta_minutes ?? null,
          job: {
            id: String(o.jobs?.id),
            title: o.jobs?.title || 'Çekici Talebi',
            pickup:
              o.jobs?.pickup_location ||
              o.jobs?.address ||
              'Konum belirtilmemiş',
            dropoff: o.jobs?.dropoff_location || null,
            customer_phone: o.jobs?.customer_phone || null,
          },
        }))
        setOffers(rows)
      }

      setLoading(false)
    }

    load()
  }, [router])

  const statusLabel = (s: string | null) => {
    const v = (s || '').toLowerCase()
    if (v === 'accepted') return 'Kabul Edildi'
    if (v === 'rejected') return 'Reddedildi'
    return 'Bekliyor'
  }

  const statusClass = (s: string | null) => {
    const v = (s || '').toLowerCase()
    if (v === 'accepted')
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
    if (v === 'rejected')
      return 'bg-red-500/15 text-red-200 border-red-400/40'
    return 'bg-slate-900/80 text-slate-200 border-slate-600'
  }

  const openMaps = (pickup: string) => {
    const q = encodeURIComponent(pickup || '')
    const url = `https://www.google.com/maps/dir/?api=1&destination=${q}`
    window.open(url, '_blank')
  }

  const completeJob = async (jobId: string) => {
    setCompletingId(jobId)
    try {
      const res = await fetch('/api/qr/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId }),
      })
      if (!res.ok) {
        throw new Error('İş tamamlanamadı.')
      }
      alert('İş tamamlandı olarak işaretlendi.')
    } catch (e: any) {
      alert(e?.message || 'İş tamamlanırken hata oluştu.')
    } finally {
      setCompletingId(null)
    }
  }

  if (checking || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Tekliflerim</h1>
        </header>

        {offers.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center text-xs text-slate-400">
            Henüz teklifiniz yok.
          </div>
        ) : (
          <ul className="space-y-3 text-xs">
            {offers.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-50">
                      {o.job.title}
                    </p>
                    <p className="flex items-center gap-1 text-amber-100/90">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {o.job.pickup}
                        {o.job.dropoff
                          ? ` → ${o.job.dropoff}`
                          : ''}
                      </span>
                    </p>
                    {o.eta_minutes && (
                      <p className="text-[11px] text-amber-100/90">
                        {o.eta_minutes} dakikada oradayım
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-bold text-emerald-200">
                      {o.price
                        ? Number(o.price).toLocaleString('tr-TR')
                        : '-'}{' '}
                      TL
                    </span>
                    <span
                      className={
                        'px-2 py-0.5 rounded-full border text-[11px] ' +
                        statusClass(o.status)
                      }
                    >
                      {statusLabel(o.status)}
                    </span>
                  </div>
                </div>

                {String(o.status || '').toLowerCase() ===
                  'accepted' && (
                  <div className="pt-2 border-t border-amber-500/30 space-y-2">
                    {o.job.customer_phone && (
                      <p className="text-[11px] text-amber-100/90">
                        Müşteri Telefonu:{' '}
                        <a
                          href={`tel:${o.job.customer_phone}`}
                          className="underline"
                        >
                          {o.job.customer_phone}
                        </a>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openMaps(o.job.pickup)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 text-amber-100 border border-amber-500/40 text-[11px]"
                      >
                        Navigasyonu Aç
                      </button>
                      <button
                        type="button"
                        onClick={() => completeJob(o.job.id)}
                        disabled={completingId === o.job.id}
                        className="flex-1 px-3 py-2 rounded-xl bg-emerald-500 text-emerald-950 text-[11px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {completingId === o.job.id && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        İşi Tamamla
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Alt Nav */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex justify-around py-2.5 text-[11px]">
          <button
            type="button"
            onClick={() => router.push('/cekici/ustalar')}
            className="flex flex-col items-center gap-0.5 text-slate-300"
          >
            <span>🏠</span>
            <span>İlanlar</span>
          </button>
          <button
            type="button"
            onClick={() =>
              router.push('/cekici/ustalar/tekliflerim')
            }
            className="flex flex-col items-center gap-0.5 text-amber-300"
          >
            <span>📋</span>
            <span>Tekliflerim</span>
          </button>
          <button
            type="button"
            onClick={() =>
              router.push('/cekici/ustalar/profil')
            }
            className="flex flex-col items-center gap-0.5 text-slate-300"
          >
            <span>👤</span>
            <span>Profil</span>
          </button>
        </div>
      </nav>
    </div>
  )
}


