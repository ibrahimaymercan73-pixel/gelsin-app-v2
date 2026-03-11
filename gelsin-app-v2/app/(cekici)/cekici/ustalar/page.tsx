'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, RefreshCw } from 'lucide-react'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

type JobRow = {
  id: string
  title: string
  description: string | null
  pickup: string
  dropoff: string | null
  vehicle: string | null
  status: string
}

export default function CekiciUstalarPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [available, setAvailable] = useState(false)

  const [jobs, setJobs] = useState<JobRow[]>([])
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({})
  const [loadingJobs, setLoadingJobs] = useState(false)

  const [offerJob, setOfferJob] = useState<JobRow | null>(null)
  const [priceTl, setPriceTl] = useState('')
  const [etaMinutes, setEtaMinutes] = useState('')
  const [submittingOffer, setSubmittingOffer] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createHizmetlerClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const { data: prof } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('service_type', 'cekici')
        .maybeSingle()

      if (!prof) {
        router.replace('/cekici/kayit')
        return
      }

      if (prof.status === 'pending') {
        setProfile(prof)
        setAvailable(!!prof.is_available)
        setChecking(false)
        return
      }

      if (prof.status !== 'approved') {
        router.replace('/cekici/kayit')
        return
      }

      setProfile(prof)
      setAvailable(!!prof.is_available)
      setChecking(false)
      await loadJobs()
    }

    const loadJobs = async () => {
      setLoadingJobs(true)
      const supabase = createHizmetlerClient()
      const { data: jrows } = await supabase
        .from('jobs')
        .select(
          'id, title, description, pickup_location, dropoff_location, vehicle_type, status, service_type'
        )
        .eq('status', 'open')
        .eq('service_type', 'cekici')

      const list: JobRow[] = (jrows || []).map((j: any) => ({
        id: String(j.id),
        title: j.title || 'Çekici Talebi',
        description:
          typeof j.description === 'string' ? j.description : null,
        pickup: j.pickup_location || j.address || 'Konum belirtilmemiş',
        dropoff: j.dropoff_location || null,
        vehicle: j.vehicle_type || null,
        status: j.status || 'open',
      }))

      setJobs(list)

      if (list.length > 0) {
        const ids = list.map((x) => x.id)
        const { data: offerRows } = await supabase
          .from('offers')
          .select('id, job_id')
          .in('job_id', ids)
        const counts: Record<string, number> = {}
        for (const o of offerRows || []) {
          const jid = String((o as any).job_id)
          counts[jid] = (counts[jid] || 0) + 1
        }
        setOfferCounts(counts)
      } else {
        setOfferCounts({})
      }

      setLoadingJobs(false)
    }

    init()
  }, [router])

  const supabase = useMemo(() => createHizmetlerClient(), [])

  const toggleAvailable = async () => {
    if (!profile) return
    const next = !available
    setAvailable(next)
    await supabase
      .from('provider_profiles')
      .update({ is_available: next })
      .eq('id', profile.id)
  }

  const openOfferModal = (job: JobRow) => {
    setOfferJob(job)
    setPriceTl('')
    setEtaMinutes('')
  }

  const submitOffer = async () => {
    if (!offerJob || !profile) return
    const price = Number(String(priceTl).replace(',', '.'))
    const eta = Number(etaMinutes)
    if (!Number.isFinite(price) || price <= 0) {
      alert('Geçerli bir fiyat girin.')
      return
    }
    if (!Number.isFinite(eta) || eta <= 0) {
      alert('Dakika bilgisini girin.')
      return
    }

    setSubmittingOffer(true)
    try {
      const { data: existing } = await supabase
        .from('offers')
        .select('id')
        .eq('job_id', offerJob.id)
        .eq('provider_id', profile.user_id)

      if (existing && existing.length > 0) {
        alert('Bu ilana zaten teklif verdiniz.')
        return
      }

      const { error } = await supabase.from('offers').insert({
        job_id: offerJob.id,
        provider_id: profile.user_id,
        price,
        eta_minutes: eta,
        message: `${eta} dakikada oradayım`,
      })
      if (error) throw error
      alert('Teklif gönderildi.')
      setOfferJob(null)
    } catch (e: any) {
      alert(e?.message || 'Teklif gönderilemedi.')
    } finally {
      setSubmittingOffer(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  if (profile && profile.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm font-semibold">
            Başvurunuz inceleniyor
          </p>
          <p className="text-xs text-slate-400">
            Çekici ustası başvurunuz onaylandığında bu ekrandan gelen
            işleri ve tekliflerinizi yönetebileceksiniz.
          </p>
        </div>
      </div>
    )
  }

  const displayName =
    profile?.full_name || profile?.display_name || 'Usta'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-amber-300/80">Merhaba</p>
            <h1 className="text-lg font-semibold">
              {displayName}
            </h1>
          </div>
          <button
            type="button"
            onClick={toggleAvailable}
            className={`relative inline-flex items-center h-8 px-1 rounded-full text-[11px] border ${
              available
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                : 'bg-slate-800 border-slate-600 text-slate-300'
            }`}
          >
            <span
              className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                available ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
            <span className="ml-2 pr-2">
              Şu an iş alabilirim
            </span>
          </button>
        </header>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Açık İlanlar</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs inline-flex items-center gap-1 text-amber-300/90"
            >
              <RefreshCw className="w-3 h-3" /> Yenile
            </button>
          </div>

          {loadingJobs ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center text-xs text-slate-400">
              Şu an açık ilan yok.
            </div>
          ) : (
            <ul className="space-y-3">
              {jobs.map((j) => (
                <li
                  key={j.id}
                  className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-950 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 text-xs">
                      <p className="text-sm font-semibold text-slate-50">
                        {j.title}
                      </p>
                      {j.description && (
                        <p className="text-amber-100/90 line-clamp-2 whitespace-pre-line">
                          {j.description}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-amber-100/90">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {j.pickup}
                          {j.dropoff
                            ? ` → ${j.dropoff}`
                            : ''}
                        </span>
                      </p>
                      {j.vehicle && (
                        <p className="text-[11px] text-amber-100/80">
                          Araç: {j.vehicle}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950/60 border border-amber-500/40 text-amber-100">
                        {(offerCounts[j.id] || 0).toString()} teklif
                      </span>
                      <button
                        type="button"
                        onClick={() => openOfferModal(j)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-emerald-950 font-semibold"
                      >
                        Teklif Ver
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Alt Nav */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex justify-around py-2.5 text-[11px]">
          <button
            type="button"
            onClick={() => router.push('/cekici/ustalar')}
            className="flex flex-col items-center gap-0.5 text-amber-300"
          >
            <span>🏠</span>
            <span>İlanlar</span>
          </button>
          <button
            type="button"
            onClick={() =>
              router.push('/cekici/ustalar/tekliflerim')
            }
            className="flex flex-col items-center gap-0.5 text-slate-300"
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

      {/* Teklif Modal */}
      {offerJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-950 border border-amber-500/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-sm text-slate-50">
                Teklif Ver
              </p>
              <button
                type="button"
                onClick={() => setOfferJob(null)}
                className="w-8 h-8 rounded-xl bg-slate-900 text-slate-200"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2">
              {offerJob.title}
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 text-slate-300">
                  Fiyat (TL)
                </label>
                <input
                  value={priceTl}
                  onChange={(e) => setPriceTl(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  placeholder="Örn: 1500"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-300">
                  Kaç dakikada oradayım?
                </label>
                <input
                  value={etaMinutes}
                  onChange={(e) =>
                    setEtaMinutes(e.target.value.replace(/\D/g, ''))
                  }
                  inputMode="numeric"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  placeholder="Örn: 20"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={submitOffer}
              disabled={submittingOffer}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-emerald-950 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submittingOffer && (
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


