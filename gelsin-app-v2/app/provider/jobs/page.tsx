'use client'
import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  Clock,
  Droplets,
  Flame,
  Hammer,
  LayoutGrid,
  MapPin,
  Navigation,
  Paintbrush,
  Puzzle,
  Radar,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const SKILL_LABELS: Record<string, string> = {
  painting: 'Boya',
  plumbing: 'Tesisat',
  carpentry: 'Marangoz',
  electric: 'Elektrik',
  cleaning: 'Temizlik',
  assembly: 'Montaj',
  repair: 'Tamir',
}

type CategoryVisual = {
  Icon: LucideIcon
  box: string
  iconColor: string
}

function categoryVisualFromJob(job: any): CategoryVisual {
  const slug = String(job?.service_categories?.slug || '').toLowerCase()
  const name = String(job?.service_categories?.name || '').toLowerCase()
  const sub = String(job?.sub_service || '').toLowerCase()
  const main = String(job?.main_category || '').toLowerCase()
  const hay = `${slug} ${name} ${sub} ${main}`

  if (/plumb|tesisat|su|su tesisat|sıhhi|lavabo|musluk|klozet|pipe/.test(hay)) {
    return { Icon: Droplets, box: 'bg-sky-500/12 ring-sky-200/60', iconColor: 'text-sky-600' }
  }
  if (/clean|temiz|temizlik|ev temiz|hali|halı|süpürge|supurge/.test(hay)) {
    return { Icon: Sparkles, box: 'bg-violet-500/12 ring-violet-200/60', iconColor: 'text-violet-600' }
  }
  if (/paint|boya|badana|boyama|duvar/.test(hay)) {
    return { Icon: Paintbrush, box: 'bg-rose-500/12 ring-rose-200/60', iconColor: 'text-rose-600' }
  }
  if (/electric|elektrik|kablo|priz|aydınlatma|aydinlatma|lamba/.test(hay)) {
    return { Icon: Zap, box: 'bg-amber-500/15 ring-amber-200/60', iconColor: 'text-amber-600' }
  }
  if (/carpent|marangoz|ahşap|ahsap|wood|dolap|mobilya/.test(hay)) {
    return { Icon: Hammer, box: 'bg-amber-800/10 ring-amber-200/50', iconColor: 'text-amber-800' }
  }
  if (/assembl|montaj|kurulum|ikea|kit/.test(hay)) {
    return { Icon: Puzzle, box: 'bg-indigo-500/12 ring-indigo-200/60', iconColor: 'text-indigo-600' }
  }
  if (/repair|tamir|onarım|onarim|arıza|ariza|fix|servis/.test(hay)) {
    return { Icon: Wrench, box: 'bg-slate-500/12 ring-slate-200/60', iconColor: 'text-slate-700' }
  }
  return { Icon: Briefcase, box: 'bg-blue-500/10 ring-blue-200/50', iconColor: 'text-blue-600' }
}

const SKILL_ICONS: Record<string, LucideIcon> = {
  plumbing: Droplets,
  painting: Paintbrush,
  carpentry: Hammer,
  electric: Zap,
  cleaning: Sparkles,
  assembly: Puzzle,
  repair: Wrench,
}

function ProviderJobsPageContent() {
  const [jobs, setJobs] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<Set<string>>(new Set())
  const [myOfferMeta, setMyOfferMeta] = useState<Record<string, { offerId: string; is_bargain_requested: boolean }>>({})
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const bargainHandledRef = useRef(false)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      setUserLat(p.coords.latitude)
      setUserLng(p.coords.longitude)
    })
    load()
  }, [])

  // Sekmeye geri dönünce veriyi yenile (müşteri pazarlık istediyse rozet güncellenir)
  useEffect(() => {
    const onVisible = () => { load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // KURAL 3: Bildirimden "pazarlık" ile gelindiğinde teklif güncelleme sayfasına git
  useEffect(() => {
    const bargainJobId = searchParams.get('bargain')
    if (!bargainJobId || bargainHandledRef.current) return
    bargainHandledRef.current = true
    const t = setTimeout(() => {
      router.push('/provider/jobs/' + bargainJobId + '/offer')
      window.history.replaceState({}, '', '/provider/jobs')
    }, 500)
    return () => clearTimeout(t)
  }, [searchParams, router])

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setJobs([])
      setMyOffers(new Set())
      setSkills([])
      return
    }

    const { data: pp } = await supabase
      .from('provider_profiles')
      .select('service_categories, main_category')
      .eq('id', user.id)
      .single()
    setSkills(Array.isArray(pp?.service_categories) ? (pp!.service_categories as string[]) : [])
    
    // pp'yi local scope'ta kullanmak için sakla
    const providerProfile = pp

    // Açık işleri çek
    const { data: j } = await supabase.from('jobs')
      .select('*, service_categories(name, icon, slug)')
      .eq('status', 'open').order('created_at', { ascending: false })
    
    // SMART FEED: Sadece uzmanın yetenekleriyle eşleşen işleri göster
    const providerSkills = Array.isArray(providerProfile?.service_categories) ? (providerProfile!.service_categories as string[]) : []
    const filteredJobs = (j || []).filter((job: any) => {
      // Eğer uzmanın hiç yeteneği yoksa tüm işleri göster (onboarding yapmamış olabilir)
      if (providerSkills.length === 0) return true
      // İşin sub_service'i uzmanın yeteneklerinde var mı?
      if (job.sub_service && providerSkills.includes(job.sub_service)) return true
      // İşin main_category'si uzmanın main_category'siyle eşleşiyor mu?
      if (job.main_category && providerProfile?.main_category === job.main_category) return true
      return false
    })
    setJobs(filteredJobs)
    const { data: o } = await supabase
      .from('offers')
      .select('job_id, id, is_bargain_requested')
      .eq('provider_id', user.id)
    const ids = new Set(Array.from((o || []).map((x: any) => x.job_id as string)))
    setMyOffers(ids)
    const meta: Record<string, { offerId: string; is_bargain_requested: boolean }> = {}
    for (const row of o || []) {
      const jid = row.job_id as string
      meta[jid] = {
        offerId: row.id,
        is_bargain_requested: row.is_bargain_requested === true,
      }
    }
    setMyOfferMeta(meta)
  }

  const distKm = (la1: number, lo1: number, la2: number, lo2: number) => {
    const R = 6371, dLat = (la2-la1)*Math.PI/180, dLon = (lo2-lo1)*Math.PI/180
    const a = Math.sin(dLat/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const chips: {
    id: string
    label: string
    Icon: LucideIcon
  }[] = [
    { id: 'all', label: 'Tümü', Icon: LayoutGrid },
    { id: 'urgent', label: 'Acil işler', Icon: Flame },
    { id: 'nearby', label: 'Yakınımdakiler', Icon: MapPin },
    ...skills.map((s) => ({
      id: `cat:${s}`,
      label: SKILL_LABELS[s] || s,
      Icon: SKILL_ICONS[s] || Briefcase,
    })),
  ]

  const withDist = jobs.map(j => ({
    ...j,
    dist:
      userLat != null && userLng != null && typeof j?.lat === 'number' && typeof j?.lng === 'number'
        ? distKm(userLat, userLng, j.lat, j.lng)
        : null,
  }))

  const filtered = withDist
    .filter((j) => {
      if (filter === 'all') return true
      if (filter === 'urgent') return j.job_type === 'urgent'
      if (filter === 'nearby') return j.dist != null && j.dist <= 10
      if (filter.startsWith('cat:')) {
        const slug = filter.slice('cat:'.length)
        return j?.service_categories?.slug === slug
      }
      return true
    })
    .sort((a, b) => (a.dist ?? 99) - (b.dist ?? 99))

  const selectedJob = selectedJobId ? filtered.find((j) => j.id === selectedJobId) || withDist.find((j) => j.id === selectedJobId) : null
  const selectedMedia: string[] = selectedJob
    ? Array.isArray(selectedJob.media_urls)
      ? (selectedJob.media_urls as string[])
      : Array.isArray(selectedJob.images)
      ? (selectedJob.images as string[])
      : []
    : []

  const whenLabel = (job: any) => {
    if (job?.job_type === 'urgent') return '⏱ Hemen'
    if (job?.scheduled_at) {
      const d = new Date(job.scheduled_at)
      if (!Number.isNaN(d.getTime())) {
        return `📅 ${d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}`
      }
    }
    return null
  }

  /** Kart alt satırı için (emoji yok, ikon ayrı) */
  const timeMetaForCard = (job: any): { kind: 'urgent' | 'date'; text: string } | null => {
    if (job?.job_type === 'urgent') return { kind: 'urgent', text: 'Hemen' }
    if (job?.scheduled_at) {
      const d = new Date(job.scheduled_at)
      if (!Number.isNaN(d.getTime())) {
        return {
          kind: 'date',
          text: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        }
      }
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/30 overflow-x-hidden w-full max-w-full font-sans">
      <header className="w-full max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-8 sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/55">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
            <Radar className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">İş Radarı</h1>
            <p className="text-slate-500 text-sm mt-0.5">Çevrendeki açık talepleri keşfet, teklif ver</p>
          </div>
        </div>

        <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5">
          {chips.map((c) => {
            const active = filter === c.id
            const ChipIcon = c.Icon
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={`inline-flex items-center gap-2 pl-3.5 pr-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-[0.98] whitespace-nowrap ring-1 ${
                  active
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 ring-violet-500/30'
                    : 'bg-slate-100/90 text-slate-600 ring-slate-200/80 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <ChipIcon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} strokeWidth={2} />
                {c.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-8 pb-32 lg:pb-10 overflow-hidden">
        <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-full">
          {filtered.map((job, i) => {
            const urgent = job.job_type === 'urgent'
            const distText =
              job.dist != null
                ? job.dist < 1
                  ? `${(job.dist * 1000).toFixed(0)} m`
                  : `${job.dist.toFixed(1)} km`
                : null
            const timeRow = timeMetaForCard(job)
            const { Icon: CatIcon, box: catBox, iconColor: catIconColor } = categoryVisualFromJob(job)

            return (
              <div
                key={job.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedJobId(job.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedJobId(job.id)
                }}
                className="group bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:shadow-slate-900/[0.07] hover:-translate-y-1 hover:border-violet-200/70 transition-all duration-300 cursor-pointer overflow-hidden animate-slide-up w-full max-w-full"
                style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
              >
                <div className="p-4 sm:p-5 md:p-6 overflow-hidden">
                  <div className="flex items-start gap-4 mb-3 overflow-hidden">
                    <div
                      className={`flex h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0 items-center justify-center rounded-2xl ring-2 ${catBox}`}
                    >
                      <CatIcon className={`h-8 w-8 sm:h-9 sm:w-9 ${catIconColor}`} strokeWidth={2} aria-hidden />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2 break-words">
                            {job.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                            {job.service_categories?.name}
                          </p>
                        </div>
                        {myOffers.has(job.id) && (
                          <span
                            className={`flex-shrink-0 max-w-[48%] sm:max-w-none text-right px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold border leading-tight ${
                              myOfferMeta[job.id]?.is_bargain_requested
                                ? 'bg-amber-50 text-amber-900 border-amber-200/90'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                            }`}
                          >
                            {myOfferMeta[job.id]?.is_bargain_requested
                              ? 'Müşteri indirim bekliyor'
                              : 'Teklif gönderildi'}
                          </span>
                        )}
                        {urgent && !myOffers.has(job.id) && (
                          <span className="relative flex-shrink-0 inline-flex">
                            <span
                              className="absolute -inset-1 rounded-full bg-red-500/35 blur-md animate-pulse"
                              aria-hidden
                            />
                            <span className="relative inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold text-white border border-red-400/50 bg-gradient-to-r from-rose-500 via-red-500 to-red-600 shadow-lg shadow-red-500/40 ring-2 ring-red-400/30 animate-pulse">
                              <Flame className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                              Acil
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {job.description && (
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-1 break-words overflow-hidden">
                      {job.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 mt-3 border-t border-slate-100">
                    {job.address && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" strokeWidth={2} aria-hidden />
                        <span className="truncate max-w-[220px] sm:max-w-md">{job.address}</span>
                      </span>
                    )}
                    {timeRow && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                        <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} aria-hidden />
                        <span>{timeRow.text}</span>
                      </span>
                    )}
                    {distText && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 shrink-0">
                        <Navigation className="h-3.5 w-3.5 text-violet-500" strokeWidth={2} aria-hidden />
                        {distText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {jobs.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
              <Radar className="h-8 w-8" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="font-bold text-slate-800 text-lg">Açık iş bulunamadı</p>
            <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">
              Filtreleri değiştir veya daha sonra tekrar bak — yeni talepler burada belirecek.
            </p>
          </div>
        )}
      </div>

      {/* Job Detail / Offer Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-3xl p-4 max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const v = categoryVisualFromJob(selectedJob)
                  const VIcon = v.Icon
                  return (
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ring-2 ${v.box}`}
                    >
                      <VIcon className={`h-6 w-6 ${v.iconColor}`} strokeWidth={2} aria-hidden />
                    </div>
                  )
                })()}
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-base truncate">{selectedJob.title}</p>
                  <p className="text-xs text-slate-600 truncate">{selectedJob.service_categories?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobId(null)}
                className="text-slate-400 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {selectedJob.description && (
              <p className="text-sm text-slate-700 bg-gray-50 border border-gray-200 rounded-2xl p-3 leading-relaxed">
                {selectedJob.description}
              </p>
            )}

            <div className="mt-3 space-y-1">
              {whenLabel(selectedJob) && (
                <p className="text-xs text-slate-600">{whenLabel(selectedJob)}</p>
              )}
              <p className="text-xs text-slate-600">📍 {selectedJob.address}</p>
            </div>

            {selectedMedia.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-bold text-slate-800">Ekler / Görseller</p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {selectedMedia.map((url: string) => {
                    const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLightbox({ url, type: isVideo ? 'video' : 'image' })
                        }}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0"
                      >
                        {isVideo ? (
                          <video src={url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={url} alt="Ek görsel" className="w-full h-full object-cover" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-bold text-slate-900 mb-2">
                {myOffers.has(selectedJob.id) ? 'Teklifin' : 'Teklif Ver'}
              </p>

              {myOffers.has(selectedJob.id) && myOfferMeta[selectedJob.id]?.is_bargain_requested !== true ? (
                <div className="badge-green w-full justify-center py-2 text-sm">✅ Teklif Verildi</div>
              ) : myOffers.has(selectedJob.id) && myOfferMeta[selectedJob.id]?.is_bargain_requested === true ? (
                <div className="space-y-2">
                  <div className="badge-green w-full justify-center py-2 text-sm">✅ Teklif Verildi</div>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5">
                    Müşteri indirim bekliyor
                  </p>
                  <button
                    type="button"
                    className="btn-secondary py-2 text-xs w-full"
                    onClick={() => {
                      router.push('/provider/jobs/' + selectedJob.id + '/offer')
                      setSelectedJobId(null)
                    }}
                  >
                    📉 Müşteri İndirim Bekliyor - Teklifi Güncelle
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-primary w-full py-3 text-sm"
                  onClick={() => {
                    router.push('/provider/jobs/' + selectedJob.id + '/offer')
                    setSelectedJobId(null)
                  }}
                >
                  Teklif Ver
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full">
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center text-lg"
            >
              ✕
            </button>
            {lightbox.type === 'video' ? (
              <video
                src={lightbox.url}
                className="w-full max-h-[80vh] rounded-2xl"
                controls
                autoPlay
              />
            ) : (
              <img
                src={lightbox.url}
                alt="Ek görsel"
                className="w-full max-h-[80vh] rounded-2xl object-contain bg-black"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProviderJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
          <div className="w-9 h-9 border-[3px] border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      }
    >
      <ProviderJobsPageContent />
    </Suspense>
  )
}
