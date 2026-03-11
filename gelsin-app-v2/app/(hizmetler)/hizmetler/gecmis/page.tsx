'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type JobRow = {
  id: string
  title: string
  service_type: 'cekici' | 'sofor'
  pickup: string
  dropoff: string | null
  status: string
  created_at: string
}

export default function GecmisTaleplerPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewJob, setReviewJob] = useState<JobRow | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login?redirect=/hizmetler/gecmis')
        return
      }

      setUserId(session.user.id)
      setChecking(false)
      setLoading(true)

      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, service_type, pickup_location, dropoff_location, status, created_at')
        .eq('customer_id', session.user.id)
        .in('service_type', ['cekici', 'sofor'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setJobs([])
      } else {
        setJobs(
          (data || []).map((j: any) => ({
            id: String(j.id),
            title: j.title || 'Talep',
            service_type: j.service_type,
            pickup: j.pickup_location || j.address || 'Konum belirtilmemiş',
            dropoff: j.dropoff_location || null,
            status: j.status || 'open',
            created_at: j.created_at,
          }))
        )
      }

      setLoading(false)
    }

    load()
  }, [router])

  const statusLabel = (s: string) => {
    const v = s.toLowerCase()
    if (v === 'open') return 'Açık'
    if (v === 'in_progress' || v === 'started') return 'Devam Ediyor'
    if (v === 'completed') return 'Tamamlandı'
    return 'Durum Yok'
  }

  const statusClass = (s: string) => {
    const v = s.toLowerCase()
    if (v === 'completed') return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
    if (v === 'open') return 'bg-blue-500/15 text-blue-200 border-blue-400/40'
    return 'bg-amber-500/15 text-amber-200 border-amber-400/40'
  }

  const openDetail = (job: JobRow) => {
    if (job.service_type === 'cekici') {
      router.push(`/cekici/${job.id}`)
    } else {
      router.push(`/sofor/${job.id}`)
    }
  }

  const openReview = (job: JobRow) => {
    setReviewJob(job)
    setRating(5)
    setComment('')
  }

  const submitReview = async () => {
    if (!reviewJob || !userId) return
    if (!rating || rating < 1 || rating > 5) {
      alert('1-5 arasında puan seçin.')
      return
    }

    setSubmittingReview(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('reviews').insert({
        job_id: reviewJob.id,
        customer_id: userId,
        rating,
        comment: comment.trim() || null,
      })
      if (error) throw error
      alert('Değerlendirmeniz kaydedildi, teşekkürler.')
      setReviewJob(null)
    } catch (e: any) {
      alert(e?.message || 'Değerlendirme kaydedilemedi.')
    } finally {
      setSubmittingReview(false)
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
        <header className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-400">
            Geçmiş Talepler
          </p>
          <h1 className="text-lg font-bold">Hizmet Geçmişiniz</h1>
        </header>

        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center space-y-3 text-xs">
            <p className="font-semibold text-slate-100">
              Henüz talebiniz yok.
            </p>
            <p className="text-slate-400">
              İlk talebinizi oluşturarak çekici veya özel şoför çağırabilirsiniz.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => router.push('/hizmetler')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-amber-950 text-xs font-semibold"
              >
                Hizmet Oluştur
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3 text-xs">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-2"
              >
                <button
                  type="button"
                  onClick={() => openDetail(j)}
                  className="w-full text-left space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg">
                      {j.service_type === 'cekici' ? '🚛' : '👨‍✈️'}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-slate-50">
                        {j.title}
                      </p>
                      <p className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {j.pickup}
                          {j.dropoff ? ` → ${j.dropoff}` : ''}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {j.created_at
                          ? new Date(j.created_at).toLocaleString('tr-TR')
                          : ''}
                      </p>
                    </div>
                    <span
                      className={
                        'px-2 py-0.5 rounded-full border text-[11px] ' +
                        statusClass(j.status)
                      }
                    >
                      {statusLabel(j.status)}
                    </span>
                  </div>
                </button>

                {j.status.toLowerCase() === 'completed' && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => openReview(j)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-emerald-950 text-[11px] font-semibold"
                    >
                      Değerlendir
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {reviewJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-950 border border-slate-800 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-50 text-sm">
                Hizmeti Değerlendir
              </p>
              <button
                type="button"
                onClick={() => setReviewJob(null)}
                className="w-8 h-8 rounded-xl bg-slate-900 text-slate-200"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-300 line-clamp-2">
              {reviewJob.title}
            </p>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-slate-200">Puanınız</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        rating >= v
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-slate-200">Yorum (opsiyonel)</p>
                <textarea
                  value={comment}
                  onChange={(e) =>
                    setComment(e.target.value.slice(0, 300))
                  }
                  rows={3}
                  className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Hizmet deneyiminizi kısaca anlatın..."
                />
                <p className="text-[11px] text-slate-500 text-right">
                  {comment.length}/300
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={submitReview}
              disabled={submittingReview}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-emerald-950 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submittingReview && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


