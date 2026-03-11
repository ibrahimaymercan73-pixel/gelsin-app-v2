'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function CekiciJobDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [checkingSession, setCheckingSession] = useState(true)
  const [job, setJob] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [toast, setToast] = useState<string | null>(null)
  const [paytrHtml, setPaytrHtml] = useState<string | null>(null)
  const [paytrLoading, setPaytrLoading] = useState(false)

  const jobId = (params as any)?.id as string | undefined

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      setCheckingSession(false)

      if (!jobId) {
        router.replace('/cekici/ilanlar')
        return
      }

      setLoading(true)
      const { data: jdata } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle()

      if (!jdata) {
        router.replace('/cekici/ilanlar')
        return
      }

      setJob(jdata as any)

      const { data: odata } = await supabase
        .from('offers')
        .select('*')
        .eq('job_id', jobId)

      setOffers((odata || []) as any[])
      setLoading(false)

      const channel = supabase
        .channel(`offers-job-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'offers',
            filter: `job_id=eq.${jobId}`,
          },
          (payload: any) => {
            setOffers((prev) => [payload.new, ...prev])
            setToast('Yeni bir teklif aldınız.')
            setTimeout(() => setToast(null), 3000)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    init()
  }, [jobId, router])

  const statusLabel = (s: any) => {
    const v = String(s || '').toLowerCase()
    if (v === 'open') return 'Açık'
    if (v === 'in_progress') return 'Devam Ediyor'
    if (v === 'completed') return 'Tamamlandı'
    return 'Bilinmiyor'
  }

  const statusColor = (s: any) => {
    const v = String(s || '').toLowerCase()
    if (v === 'open') return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
    if (v === 'in_progress') return 'bg-amber-500/15 text-amber-300 border-amber-400/40'
    if (v === 'completed') return 'bg-slate-800 text-slate-100 border-slate-600'
    return 'bg-slate-900 text-slate-200 border-slate-700'
  }

  const acceptOffer = async (offer: any) => {
    if (!jobId) return
    try {
      setPaytrLoading(true)
      const res = await fetch('/api/paytr/create-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          offerId: offer.id,
        }),
      })

      if (!res.ok) {
        throw new Error('Ödeme başlatılamadı.')
      }

      const data = await res.json()
      if (!data?.html && !data?.iframeHtml) {
        throw new Error('Geçersiz PayTR yanıtı.')
      }

      setPaytrHtml(String(data.html || data.iframeHtml))
    } catch (e: any) {
      alert(e?.message || 'Teklif kabul edilirken hata oluştu.')
    } finally {
      setPaytrLoading(false)
    }
  }

  if (checkingSession || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p>İş kaydı bulunamadı.</p>
      </div>
    )
  }

  const vehicle = job.vehicle_type || 'Araç'
  const transmission = job.transmission_type || 'Vites'
  const pickup = job.pickup_location || job.address || ''
  const dropoff = job.dropoff_location || ''

  const photos: any[] =
    (Array.isArray(job.photos) && job.photos) ||
    (Array.isArray(job.images) && job.images) ||
    []

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <header className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full w-9 h-9 flex items-center justify-center bg-amber-500/10 border border-amber-400/40 text-amber-300"
            aria-label="Geri"
          >
            ←
          </button>
          <div className="flex-1 space-y-2 text-right">
            <div className="flex items-center justify-end gap-2">
              <span
                className={
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium ' +
                  statusColor(job.status)
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {statusLabel(job.status)}
              </span>
            </div>
            <h1 className="text-base font-semibold leading-snug line-clamp-2">
              {job.title || 'Çekici Talebi'}
            </h1>
            <p className="text-[11px] text-slate-300">
              {vehicle} · {transmission}
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-950 p-4 space-y-2 text-xs">
          {pickup && (
            <p className="text-slate-100">
              <span className="font-semibold text-amber-300">
                Alınacak:
              </span>{' '}
              {pickup}
            </p>
          )}
          {dropoff && (
            <p className="text-slate-100">
              <span className="font-semibold text-amber-300">
                Bırakılacak:
              </span>{' '}
              {dropoff}
            </p>
          )}
          {job.description && (
            <p className="text-slate-200 whitespace-pre-line mt-1">
              {String(job.description)}
            </p>
          )}
        </section>

        {photos.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-medium text-slate-200">
              Fotoğraflar
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((src: any, idx: number) => (
                <div
                  key={idx}
                  className="w-32 h-24 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={String(src)}
                    alt="Araç fotoğrafı"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Gelen Teklifler
          </h2>
          {offers.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-center text-xs text-amber-200 animate-pulse">
              Henüz teklif gelmedi, bekliyorsunuz...
            </div>
          ) : (
            <ul className="space-y-3">
              {offers.map((offer) => {
                const providerName =
                  offer.provider_name ||
                  offer.provider_full_name ||
                  'Çekici Ustası'
                const rating = offer.provider_rating
                const eta =
                  offer.eta_minutes ||
                  offer.estimated_duration ||
                  null

                return (
                  <li
                    key={String(offer.id)}
                    className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-50">
                          {providerName}
                        </p>
                        {eta && (
                          <p className="text-[11px] text-amber-100/90">
                            {typeof eta === 'number'
                              ? `${eta} dakikada oradayım`
                              : String(eta)}
                          </p>
                        )}
                      </div>
                      {rating ? (
                        <div className="flex items-center gap-1 text-xs text-amber-200">
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span>{Number(rating).toFixed(1)}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-bold text-emerald-200">
                        {offer.price ? Number(offer.price).toLocaleString('tr-TR') : '-'} TL
                      </p>
                      <button
                        type="button"
                        onClick={() => acceptOffer(offer)}
                        className="px-3 py-2 rounded-xl bg-emerald-500 text-emerald-950 text-xs font-semibold shadow-md shadow-emerald-900/40 disabled:opacity-60"
                        disabled={paytrLoading}
                      >
                        Teklifi Kabul Et
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-950/95 border border-amber-500/40 text-xs text-amber-100 shadow-lg">
          {toast}
        </div>
      )}

      {paytrHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <p className="text-sm font-semibold text-slate-100">
                Ödeme Ekranı
              </p>
              <button
                type="button"
                onClick={() => setPaytrHtml(null)}
                className="text-slate-400 text-sm"
              >
                Kapat
              </button>
            </div>
            <div
              className="bg-white"
              dangerouslySetInnerHTML={{ __html: paytrHtml }}
            />
          </div>
        </div>
      )}
    </div>
  )
}


