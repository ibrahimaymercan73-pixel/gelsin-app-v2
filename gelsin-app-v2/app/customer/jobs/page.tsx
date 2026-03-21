'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, MapPin, Calendar, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type TabKey = 'open' | 'offers' | 'progress' | 'done'

type JobWithMeta = {
  id: string
  title: string
  status: string
  created_at: string
  agreed_price: number | null
  job_type: 'urgent' | 'scheduled' | 'process' | null
  address: string
  service_categories?: { name: string; icon?: string; slug?: string } | null
  offerCount: number
  hasAcceptedOffer: boolean
}

const tabConfig: Record<TabKey, { label: string; description: string }> = {
  open: {
    label: 'Açık İşler',
    description: 'Henüz teklif gelmemiş ilanlar',
  },
  offers: {
    label: 'Teklif Gelenler',
    description: 'Uzmanlardan teklif bekleyen işler',
  },
  progress: {
    label: 'Devam Edenler',
    description: 'Uzman ataması yapılmış aktif işler',
  },
  done: {
    label: 'Tamamlananlar',
    description: 'Tamamlanan, iptal edilen veya uyuşmazlık açılan işler',
  },
}

const statusBadge: Record<
  string,
  { label: string; bg: string; color: string; ring: string }
> = {
  open: {
    label: 'Teklif Bekleniyor',
    bg: 'bg-blue-50/95',
    color: 'text-blue-800',
    ring: 'ring-blue-100/80',
  },
  offered: {
    label: 'Teklif Geldi',
    bg: 'bg-amber-50/95',
    color: 'text-amber-900',
    ring: 'ring-amber-100/80',
  },
  accepted: {
    label: 'Uzman Yolda',
    bg: 'bg-emerald-50/95',
    color: 'text-emerald-900',
    ring: 'ring-emerald-100/80',
  },
  started: {
    label: 'İş Devam Ediyor',
    bg: 'bg-orange-50/95',
    color: 'text-orange-900',
    ring: 'ring-orange-100/80',
  },
  completed: {
    label: 'Tamamlandı',
    bg: 'bg-slate-100/95',
    color: 'text-slate-700',
    ring: 'ring-slate-200/80',
  },
  cancelled: {
    label: 'İptal Edildi',
    bg: 'bg-red-50/95',
    color: 'text-red-800',
    ring: 'ring-red-100/80',
  },
  disputed: {
    label: 'Uyuşmazlık',
    bg: 'bg-amber-50/95',
    color: 'text-amber-900',
    ring: 'ring-amber-100/80',
  },
}

function categoryIconBox(slug?: string | null) {
  const s = String(slug || '').toLowerCase()
  let grad = 'from-indigo-500 via-violet-500 to-purple-600'
  if (/plumb|tesisat|su|sıhhi/.test(s)) grad = 'from-sky-500 to-blue-600'
  else if (/clean|temiz/.test(s)) grad = 'from-violet-500 to-fuchsia-600'
  else if (/paint|boya|badana/.test(s)) grad = 'from-rose-500 to-pink-600'
  else if (/electric|elektrik/.test(s)) grad = 'from-amber-500 to-orange-600'
  else if (/carpent|marangoz|ahşap|ahsap/.test(s)) grad = 'from-amber-700 to-yellow-700'
  else if (/repair|tamir|montaj|assembl/.test(s)) grad = 'from-slate-600 to-slate-800'
  return `bg-gradient-to-br ${grad}`
}

function deriveBucket(job: JobWithMeta): TabKey {
  const rawStatus: string = (job.status as string) || 'open'
  const hasOffers = job.offerCount > 0

  if (rawStatus === 'completed' || rawStatus === 'cancelled' || rawStatus === 'disputed')
    return 'done'
  if (rawStatus === 'accepted' || rawStatus === 'started') return 'progress'
  if (hasOffers) return 'offers'
  return 'open'
}

function deriveStatusKey(job: JobWithMeta): string {
  const rawStatus: string = (job.status as string) || 'open'
  const hasOffers = job.offerCount > 0

  if (rawStatus === 'completed' || rawStatus === 'cancelled' || rawStatus === 'disputed')
    return rawStatus
  if (rawStatus === 'accepted' || rawStatus === 'started') return rawStatus
  if (hasOffers && rawStatus === 'open') return 'offered'
  return rawStatus
}

const TAB_KEYS: TabKey[] = ['open', 'offers', 'progress', 'done']

function CustomerJobsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [jobs, setJobs] = useState<JobWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    tabParam && TAB_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : 'open'
  )

  useEffect(() => {
    if (tabParam && TAB_KEYS.includes(tabParam as TabKey)) {
      setActiveTab(tabParam as TabKey)
    }
  }, [tabParam])

  const load = async () => {
    setLoading(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setJobs([])
      setLoading(false)
      return
    }

    const { data: jobRows } = await supabase
      .from('jobs')
      .select(
        'id, title, status, created_at, agreed_price, job_type, address, service_categories(name, icon, slug)'
      )
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    const rows = (jobRows || []) as any[]
    const jobIds = rows.map((j) => j.id as string)

    let offersByJob: Record<string, { total: number; hasAccepted: boolean }> = {}

    if (jobIds.length > 0) {
      const { data: offers } = await supabase
        .from('offers')
        .select('job_id, status')
        .in('job_id', jobIds)

      for (const o of offers || []) {
        const jobId = o.job_id as string
        if (!offersByJob[jobId]) {
          offersByJob[jobId] = { total: 0, hasAccepted: false }
        }
        offersByJob[jobId].total += 1
        if (o.status === 'accepted') {
          offersByJob[jobId].hasAccepted = true
        }
      }
    }

    const mapped: JobWithMeta[] = rows.map((job) => {
      const info = offersByJob[job.id] || { total: 0, hasAccepted: false }
      return {
        id: job.id,
        title: job.title,
        status: job.status,
        created_at: job.created_at,
        agreed_price: job.agreed_price ?? null,
        job_type: job.job_type ?? null,
        address: job.address,
        service_categories: job.service_categories,
        offerCount: info.total,
        hasAcceptedOffer: info.hasAccepted,
      }
    })

    let categoryFilter: string | null = null
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      categoryFilter = params.get('category')
    }

    const filtered =
      categoryFilter && categoryFilter.length > 0
        ? mapped.filter((job) => job.service_categories?.slug === categoryFilter)
        : mapped

    setJobs(filtered)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const grouped: Record<TabKey, JobWithMeta[]> = {
    open: [],
    offers: [],
    progress: [],
    done: [],
  }

  for (const job of jobs) {
    const bucket = deriveBucket(job)
    grouped[bucket].push(job)
  }

  const counts: Record<TabKey, number> = {
    open: grouped.open.length,
    offers: grouped.offers.length,
    progress: grouped.progress.length,
    done: grouped.done.length,
  }

  const activeJobs = grouped[activeTab]

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50 font-sans">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100/70 font-sans antialiased">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-slate-50/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Müşteri paneli
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">İşlerim</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push('/customer/new-job')}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] md:px-5"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            <span className="hidden sm:inline">Yeni iş talebi</span>
            <span className="sm:hidden">Yeni</span>
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6">
        {/* Pills tabs: mobile = single-row horizontal scroll, desktop = wrap */}
        <div className="mb-8 -mx-4 overflow-x-auto overflow-y-hidden hide-scrollbar sm:mx-0 sm:overflow-visible">
          <div
            className="flex w-max min-w-full flex-nowrap gap-2 px-[18px] pb-0.5 sm:w-auto sm:min-w-0 sm:flex-wrap sm:gap-2 sm:px-0 sm:pb-0"
            role="tablist"
            aria-label="İş kategorileri"
          >
            {(Object.keys(tabConfig) as TabKey[]).map((key) => {
              const selected = activeTab === key
              const n = counts[key]
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[13px] ${
                    selected
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_20px_-2px_rgba(37,99,235,0.55)] ring-2 ring-blue-400/50 sm:from-blue-600 sm:to-blue-600 sm:shadow-md sm:shadow-blue-600/25 sm:ring-blue-500/20'
                      : 'bg-slate-500/[0.06] text-slate-600 ring-1 ring-slate-300/25 backdrop-blur-[2px] hover:bg-slate-500/[0.1] sm:bg-white/90 sm:shadow-sm sm:shadow-slate-900/[0.04] sm:ring-slate-200/80 sm:backdrop-blur-none sm:hover:bg-white sm:hover:ring-slate-300/90'
                  }`}
                >
                  <span className="whitespace-nowrap">{tabConfig[key].label}</span>
                  <span
                    className={`flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums sm:min-h-[1.375rem] sm:min-w-[1.375rem] sm:px-1.5 sm:text-[11px] ${
                      selected
                        ? 'bg-white/25 text-white ring-1 ring-white/30'
                        : 'bg-slate-400/15 text-slate-700 ring-1 ring-slate-400/20 sm:bg-slate-200/90 sm:text-slate-800 sm:ring-slate-300/50'
                    }`}
                  >
                    {n}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {activeJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white/80 p-10 text-center shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)]">
            <div className="text-4xl mb-3 opacity-90">
              {activeTab === 'open'
                ? '📭'
                : activeTab === 'offers'
                  ? '⏳'
                  : activeTab === 'progress'
                    ? '🚗'
                    : '📁'}
            </div>
            <p className="font-semibold text-slate-800">Bu sekmede iş yok</p>
            <p className="mt-1 text-sm text-slate-500">{tabConfig[activeTab].description}</p>
            <button
              type="button"
              onClick={() => router.push('/customer/new-job')}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-transform hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Yeni iş talebi
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {activeJobs.map((job) => {
              const statusKey = deriveStatusKey(job)
              const badge = statusBadge[statusKey] || statusBadge.open
              const slug = job.service_categories?.slug
              const iconGrad = categoryIconBox(slug)
              const dateStr = new Date(job.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })

              return (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/customer/jobs/${job.id}`)}
                    className="group flex w-full gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-[0_2px_16px_-6px_rgba(15,23,42,0.08)] transition-all hover:border-slate-300/80 hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] sm:gap-5 sm:p-5"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl text-white shadow-md ring-2 ring-white/30 ${iconGrad}`}
                    >
                      <span className="drop-shadow-sm">{job.service_categories?.icon || '🛠️'}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                              {job.title}
                            </h2>
                            {job.job_type === 'urgent' && (
                              <span className="relative inline-flex shrink-0">
                                <span
                                  className="absolute inset-0 rounded-full bg-red-500/35 blur-sm animate-pulse"
                                  aria-hidden
                                />
                                <span className="relative rounded-full bg-gradient-to-r from-red-500 to-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-red-400/40">
                                  Acil
                                </span>
                              </span>
                            )}
                            {job.job_type === 'scheduled' && (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200/80">
                                Randevulu
                              </span>
                            )}
                          </div>
                          {job.service_categories?.name && (
                            <p className="mt-1.5 text-sm font-medium text-slate-500">
                              {job.service_categories.name}
                            </p>
                          )}
                        </div>

                        <div
                          className={`shrink-0 self-start rounded-xl px-3 py-2 text-center ring-1 sm:min-w-[8.5rem] ${badge.bg} ${badge.color} ${badge.ring}`}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                            Durum
                          </p>
                          <p className="mt-0.5 text-xs font-bold leading-tight">{badge.label}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                        <span className="inline-flex items-start gap-2.5 text-sm text-slate-600">
                          <MapPin
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span className="line-clamp-2 leading-snug">{job.address}</span>
                        </span>
                        <span className="inline-flex items-center gap-2.5 text-sm text-slate-500">
                          <Calendar className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
                          {dateStr}
                        </span>
                        <span className="inline-flex items-center gap-2.5 text-sm text-slate-500">
                          <MessageCircle className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
                          {job.offerCount > 0 ? (
                            <span>
                              <span className="font-semibold text-slate-700">{job.offerCount}</span> teklif
                            </span>
                          ) : (
                            <span>Henüz teklif yok</span>
                          )}
                        </span>
                      </div>

                      {job.agreed_price != null && Number(job.agreed_price) > 0 && (
                        <p className="mt-3 text-right text-lg font-bold tabular-nums text-blue-700">
                          ₺{Number(job.agreed_price).toLocaleString('tr-TR')}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function CustomerJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-slate-50 font-sans">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      }
    >
      <CustomerJobsPageContent />
    </Suspense>
  )
}
