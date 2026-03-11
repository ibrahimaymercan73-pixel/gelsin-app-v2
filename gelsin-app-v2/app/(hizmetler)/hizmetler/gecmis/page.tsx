'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Star } from 'lucide-react'

type JobRow = {
  id: string
  title: string
  description: string | null
  address: string
  status: string
  created_at: string
  provider_id: string | null
}

function statusBadge(s: string) {
  if (s === 'completed') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (s === 'cancelled') return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  if (s === 'accepted' || s === 'started') return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
}

function statusLabel(s: string) {
  if (s === 'completed') return 'Tamamlandı'
  if (s === 'cancelled') return 'İptal'
  if (s === 'accepted' || s === 'started') return 'Devam Ediyor'
  return 'Açık'
}

function guessServiceType(job: JobRow): 'cekici' | 'sofor' | null {
  const t = (job.title || '').toLowerCase()
  const d = (job.description || '').toLowerCase()
  if (t.includes('çekici') || d.includes('[çekici]') || d.includes('çekici')) return 'cekici'
  if (t.includes('şoför') || d.includes('[özel şoför]') || d.includes('şoför')) return 'sofor'
  return null
}

export default function HizmetlerGecmisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const [reviewJob, setReviewJob] = useState<JobRow | null>(null)
  const [rating, setRating] = useState<number>(5)
  const [comment, setComment] = useState<string>('') 
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login?redirect=/hizmetler/gecmis')
      return
    }
    const uid = session.user.id
    setUserId(uid)

    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, description, address, status, created_at, provider_id')
      .eq('customer_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setJobs([])
    } else {
      const all = (data || []) as any[]
      // service_type kolonu her ortamda olmadığı için title/description üzerinden filtreliyoruz.
      const filtered = all
        .map((r) => ({
          id: String(r.id),
          title: String(r.title || ''),
          description: typeof r.description === 'string' ? r.description : null,
          address: String(r.address || ''),
          status: String(r.status || 'open'),
          created_at: String(r.created_at || ''),
          provider_id: r.provider_id ? String(r.provider_id) : null,
        }))
        .filter((j) => guessServiceType(j) !== null)
      setJobs(filtered)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitReview = async () => {
    if (!reviewJob || !userId) return
    if (!reviewJob.provider_id) return alert('Bu işte uzman yok.')
    if (rating < 1 || rating > 5) return alert('1-5 arası puan verin.')
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('job_id', reviewJob.id)
        .limit(1)
      if (existing && existing.length > 0) {
        alert('Bu işi zaten değerlendirdiniz.')
        setReviewJob(null)
        return
      }

      const { error } = await supabase.from('reviews').insert({
        job_id: reviewJob.id,
        customer_id: userId,
        provider_id: reviewJob.provider_id,
        rating,
        comment: comment.trim() || null,
      } as any)
      if (error) throw error
      alert('Değerlendirmeniz kaydedildi.')
      setReviewJob(null)
      setComment('')
      setRating(5)
    } catch (e: any) {
      alert(e?.message || 'Değerlendirme kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Geçmiş Taleplerim</h1>
          <a href="/hizmetler" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            ← Hizmetler
          </a>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-slate-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center space-y-2">
            <p className="font-semibold text-slate-900">Henüz talebiniz yok</p>
            <a href="/hizmetler" className="inline-flex justify-center w-full py-3 rounded-2xl bg-slate-900 text-white font-semibold">
              Hizmet seç
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => {
              const type = guessServiceType(j)
              const icon = type === 'cekici' ? '🚛' : '👨‍✈️'
              const href = type === 'cekici' ? `/cekici/${j.id}` : `/sofor/${j.id}`
              return (
                <li key={j.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <button
                    type="button"
                    onClick={() => router.push(href)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl">{icon}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusBadge(j.status)}`}>
                            {statusLabel(j.status)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 line-clamp-2">{j.title}</p>
                        {j.address && <p className="text-xs text-slate-500 line-clamp-1">{j.address}</p>}
                        <p className="text-xs text-slate-400">{j.created_at ? new Date(j.created_at).toLocaleString('tr-TR') : ''}</p>
                      </div>
                    </div>
                  </button>

                  {j.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => setReviewJob(j)}
                      className="mt-3 w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold"
                    >
                      Değerlendir
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {reviewJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900 text-sm">Değerlendir</p>
              <button
                type="button"
                onClick={() => setReviewJob(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{reviewJob.title}</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1"
                  aria-label={`${n} yıldız`}
                >
                  <Star className={`w-6 h-6 ${n <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              placeholder="Yorum (opsiyonel)"
            />
            <button
              type="button"
              onClick={submitReview}
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-semibold disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

