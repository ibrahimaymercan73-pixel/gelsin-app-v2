 'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function SoforJobDetailPage() {
  const params = useParams()
  const router = useRouter()

  // NOTE: İstek üzerine tüm state'ler any / any[] tipinde tutuluyor
  const [loading, setLoading] = useState<any>(true)
  const [job, setJob] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        const jobId = (params as any)?.id
        if (!jobId) {
          router.replace('/sofor/ilanlar')
          return
        }

        const { data: jdata, error: jerr } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle()

        if (jerr || !jdata) {
          router.replace('/sofor/ilanlar')
          return
        }

        setJob(jdata as any)

        const { data: odata } = await supabase
          .from('offers')
          .select('*')
          .eq('job_id', jobId)

        setOffers((odata || []) as any[])
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-950 text-slate-100">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-950 text-slate-100">
        <p>İlan bulunamadı.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">Özel Şoför</p>
            <h1 className="text-lg font-bold line-clamp-2">
              {(job as any)?.title || 'İlan Detayı'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-2 rounded-xl bg-indigo-900/80 text-slate-200 text-sm hover:bg-indigo-800"
          >
            Geri
          </button>
        </header>

        <div className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4 space-y-3">
          {job.description ? (
            <p className="text-sm text-slate-200 whitespace-pre-line">
              {String(job.description)}
            </p>
          ) : null}

          <div className="text-xs text-slate-400 space-y-1">
            {job.address && (
              <p>
                <span className="font-semibold text-slate-300">Adres: </span>
                {String(job.address)}
              </p>
            )}
            {job.status && (
              <p>
                <span className="font-semibold text-slate-300">Durum: </span>
                {String(job.status)}
              </p>
            )}
            {job.created_at && (
              <p>
                <span className="font-semibold text-slate-300">Oluşturulma: </span>
                {new Date(job.created_at as any).toLocaleString('tr-TR')}
              </p>
            )}
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-100">Teklifler</h2>
          {offers.length === 0 ? (
            <p className="text-xs text-slate-500">Bu ilana henüz teklif verilmemiş.</p>
          ) : (
            <ul className="space-y-2">
              {offers.map((o: any) => (
                <li
                  key={String(o.id)}
                  className="rounded-xl border border-indigo-800 bg-indigo-900/40 p-3 text-xs text-slate-200 space-y-1"
                >
                  {o.price && (
                    <p>
                      <span className="font-semibold text-slate-300">Tutar: </span>
                      {String(o.price)} TL
                    </p>
                  )}
                  {o.estimated_duration && (
                    <p>
                      <span className="font-semibold text-slate-300">Süre / Müsaitlik: </span>
                      {String(o.estimated_duration)}
                    </p>
                  )}
                  {o.message && (
                    <p className="text-slate-400">{String(o.message)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

