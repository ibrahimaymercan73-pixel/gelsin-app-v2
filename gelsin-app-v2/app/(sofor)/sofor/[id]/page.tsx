'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, MapPin, Loader2 } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  open: 'Açık',
  offered: 'Teklif Alındı',
  accepted: 'Devam Ediyor',
  started: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  disputed: 'Anlaşmazlık',
}

export default function SoforDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''
  const [job, setJob] = useState<Record<string, unknown> | null>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [counterpart, setCounterpart] = useState<{ full_name: string | null; phone: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  const load = async () => {
    if (!id) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    const { data: j, error: jobErr } = await supabase
      .from('jobs')
      .select('*, service_categories(name, icon)')
      .eq('id', id)
      .eq('customer_id', user.id)
      .single()

    if (jobErr || !j) {
      setJob(null)
      setLoading(false)
      return
    }
    setJob(j as Record<string, unknown>)

    const { data: offerRows } = await supabase
      .from('offers')
      .select('id, job_id, provider_id, price, estimated_duration, message, status')
      .eq('job_id', id)
      .order('price', { ascending: true })

    const list = (offerRows || []) as any[]
    const providerIds = [...new Set(list.map((o) => o.provider_id).filter(Boolean))]

    let profilesById: Record<string, any> = {}
    let providerProfilesById: Record<string, any> = {}
    if (providerIds.length > 0) {
      const norm = (x: string) => String(x).toLowerCase().trim()
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name, avatar_url')
        .in('id', providerIds)
      profilesById = Object.fromEntries(((profiles || []) as any[]).map((p) => [norm(p.id), p]))
      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('id, rating, total_reviews, completed_jobs, avg_response_time_mins')
        .in('id', providerIds)
      providerProfilesById = Object.fromEntries(((pp || []) as any[]).map((p) => [norm(p.id), p]))
    }

    const enriched = list.map((o) => {
      const nid = o.provider_id ? String(o.provider_id).toLowerCase().trim() : ''
      return {
        ...o,
        profiles: nid ? profilesById[nid] ?? null : null,
        provider_profiles: nid ? providerProfilesById[nid] ?? null : null,
      }
    })
    setOffers(enriched)

    if (j.provider_id) {
      const { data: rpc } = await supabase.rpc('get_counterpart_contact', { p_job_id: id })
      const row = Array.isArray(rpc) && rpc[0] ? (rpc[0] as { phone: string | null; full_name: string | null }) : null
      setCounterpart(row)
    } else {
      setCounterpart(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setAuthChecked(true)
    }
    check()
  }, [router])

  useEffect(() => {
    if (!authChecked || !id) return
    load()
  }, [authChecked, id])

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`sofor-job-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers', filter: `job_id=eq.${id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-indigo-950 text-slate-100 flex items-center justify-center px-4">
        <p className="text-slate-400">Talep bulunamadı.</p>
      </div>
    )
  }

  const status = (job.status as string) || 'open'
  const hasOffers = offers.length > 0
  const statusLabel = status === 'open' && hasOffers ? 'Teklif Alındı' : STATUS_LABELS[status] || status
  const isAccepted = status === 'accepted' || status === 'started'
  const isCompleted = status === 'completed'

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-indigo-900/80 text-amber-400/90 hover:bg-indigo-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-amber-400">Özel şoför talebi</h1>
        </header>

        {/* ÜST - Talep özeti */}
        <section className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4 mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
              {statusLabel}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200">{job.title as string}</p>
          {job.description && (
            <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{String(job.description)}</p>
          )}
          {job.address && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              {String(job.address)}
            </p>
          )}
        </section>

        {/* ORTA - Teklifler */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">Gelen teklifler</h2>
          {offers.length === 0 ? (
            <div className="rounded-2xl border border-indigo-800 bg-indigo-900/30 p-4 text-center text-slate-500 text-sm">
              Henüz teklif yok.
            </div>
          ) : (
            <ul className="space-y-3">
              {offers.map((offer) => (
                <li
                  key={offer.id}
                  className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-slate-100 text-sm">
                        {offer.profiles?.full_name || 'Uzman'}
                      </p>
                      <p className="text-xs text-slate-500">
                        ★ {offer.provider_profiles?.rating ?? '—'} · {offer.provider_profiles?.completed_jobs ?? 0} iş tamamladı
                      </p>
                    </div>
                    <p className="text-lg font-bold text-amber-400">₺{offer.price}</p>
                  </div>
                  {offer.message && (
                    <p className="text-xs text-slate-400 mb-3 italic">&quot;{offer.message}&quot;</p>
                  )}
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-xl bg-indigo-800 text-slate-400 text-sm font-medium cursor-not-allowed"
                  >
                    Teklifi Kabul Et (Yakında)
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ALT - Durum takibi */}
        {(isAccepted || isCompleted) && (counterpart || job.provider_id) && (
          <section className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4">
            <h2 className="text-sm font-semibold text-slate-400 mb-3">Durum takibi</h2>
            <p className="text-sm text-slate-200">
              {counterpart?.full_name || 'Sağlayıcı'}
            </p>
            {counterpart?.phone && (
              <a
                href={`tel:${counterpart.phone}`}
                className="inline-flex mt-1 text-amber-400 text-sm font-medium"
              >
                📞 {counterpart.phone}
              </a>
            )}
            <p className="text-xs text-slate-500 mt-2">Tahmini varış: Uzman tarafından paylaşılacak</p>
            {isCompleted ? (
              <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                Teslim Edildi
              </div>
            ) : (
              <button
                type="button"
                disabled
                className="mt-3 w-full py-2.5 rounded-xl bg-indigo-800 text-slate-400 text-sm font-medium cursor-not-allowed"
              >
                Teslim Edildi (iş tamamlanınca)
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
