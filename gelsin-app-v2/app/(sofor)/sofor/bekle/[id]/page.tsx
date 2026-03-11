'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

export default function SoforBeklePage() {
  const params = useParams()
  const router = useRouter()
  const jobId = (params as any)?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    const supabase = createHizmetlerClient()

    const load = async () => {
      setLoading(true)
      const { data: j } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle()
      setJob(j || null)

      const { data: o } = await supabase
        .from('offers')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
      setOffers(o || [])
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`sofor-offers-${jobId}`)
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId])

  const acceptOffer = async (offerId: string) => {
    if (!jobId) return
    setAcceptingId(offerId)
    try {
      const supabase = createHizmetlerClient()
      const { error: e1 } = await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('id', offerId)
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('jobs')
        .update({ status: 'accepted' })
        .eq('id', jobId)
      if (e2) throw e2

      router.replace(`/sofor/odeme/${jobId}`)
    } catch (e: any) {
      alert(e?.message || 'Teklif kabul edilemedi.')
    } finally {
      setAcceptingId(null)
    }
  }

  if (!jobId || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <header className="space-y-1">
          <p className="text-xs text-indigo-300/80">
            Şoför Talebi Bekleme Ekranı
          </p>
          <h1 className="text-lg font-semibold">
            {job?.title || 'Şoför Talebi'}
          </h1>
          <p className="text-[11px] text-slate-400">
            Şoförler teklif verdikçe burada göreceksiniz.
          </p>
        </header>

        <section className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4 text-xs space-y-2">
          {job?.pickup_location && (
            <p>
              <span className="font-semibold text-indigo-100">
                Nereden:{' '}
              </span>
              <span className="text-slate-50">
                {job.pickup_location}
              </span>
            </p>
          )}
          {job?.dropoff_location && (
            <p>
              <span className="font-semibold text-indigo-100">
                Nereye:{' '}
              </span>
              <span className="text-slate-50">
                {job.dropoff_location}
              </span>
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Gelen Teklifler
          </h2>
          {offers.length === 0 ? (
            <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-5 text-center text-xs text-indigo-100 animate-pulse">
              Henüz teklif gelmedi, bekliyorsunuz...
            </div>
          ) : (
            <ul className="space-y-3 text-xs">
              {offers.map((o) => (
                <li
                  key={o.id}
                  className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-50">
                        {o.provider_name || 'Şoför'}
                      </p>
                      {o.eta_minutes && (
                        <p className="text-[11px] text-indigo-100/90">
                          {o.eta_minutes} dakikada orada
                        </p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-emerald-200">
                      {o.price
                        ? Number(o.price).toLocaleString('tr-TR')
                        : '-'}{' '}
                      TL
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => acceptOffer(String(o.id))}
                    disabled={acceptingId === String(o.id)}
                    className="w-full py-2 rounded-xl bg-emerald-500 text-emerald-950 font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {acceptingId === String(o.id) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Teklifi Kabul Et
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

