'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

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
    description: 'Ustalardan teklif bekleyen işler',
  },
  progress: {
    label: 'Devam Edenler',
    description: 'Usta ataması yapılmış aktif işler',
  },
  done: {
    label: 'Tamamlananlar',
    description: 'Tamamlanan, iptal edilen veya uyuşmazlık açılan işler',
  },
}

const statusBadge: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  open: {
    label: 'Teklif Bekleniyor',
    bg: 'bg-blue-50',
    color: 'text-blue-700',
  },
  offered: {
    label: 'Teklif Geldi',
    bg: 'bg-orange-50',
    color: 'text-orange-700',
  },
  accepted: {
    label: 'Usta Yolda',
    bg: 'bg-emerald-50',
    color: 'text-emerald-700',
  },
  started: {
    label: 'İş Devam Ediyor',
    bg: 'bg-orange-50',
    color: 'text-orange-700',
  },
  completed: {
    label: 'Tamamlandı',
    bg: 'bg-gray-50',
    color: 'text-gray-600',
  },
  cancelled: {
    label: 'İptal Edildi',
    bg: 'bg-red-50',
    color: 'text-red-700',
  },
  disputed: {
    label: 'Uyuşmazlık Açıldı',
    bg: 'bg-amber-50',
    color: 'text-amber-700',
  },
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

export default function CustomerJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('open')

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

    let offersByJob: Record<string, { total: number; hasAccepted: boolean }> =
      {}

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
      <div className="flex items-center justify-center min-h-dvh bg-[#F4F7FA]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
            Müşteri Paneli
          </p>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 mt-0.5">
            İşlerim
          </h1>
        </div>
        <button
          onClick={() => router.push('/customer/new-job')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm shadow-blue-600/30"
        >
          + Yeni İş Talebi
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
        <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm flex flex-wrap gap-2 mb-6">
          {(Object.keys(tabConfig) as TabKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{tabConfig[key].label}</span>
              {counts[key] > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === key
                      ? 'bg-white/15 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 mb-4">
          {tabConfig[activeTab].description}
        </p>

        {activeJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-200">
            <div className="text-5xl mb-3">
              {activeTab === 'open'
                ? '📭'
                : activeTab === 'offers'
                ? '⏳'
                : activeTab === 'progress'
                ? '🚗'
                : '📁'}
            </div>
            <p className="font-bold text-slate-700 mb-1">
              Bu kategoride iş bulunmuyor
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Yeni bir iş talebi oluşturarak ustalardan teklif isteyebilirsiniz.
            </p>
            <button
              onClick={() => router.push('/customer/new-job')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold"
            >
              Yeni İş Talebi Oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job) => {
              const statusKey = deriveStatusKey(job)
              const badge = statusBadge[statusKey] || statusBadge.open

              return (
                <button
                  key={job.id}
                  onClick={() => router.push(`/customer/jobs/${job.id}`)}
                  className="w-full bg-white rounded-3xl p-4 lg:p-5 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left flex items-start gap-4"
                >
                  <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
                    {job.service_categories?.icon || '🛠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {job.title}
                      </p>
                      {job.agreed_price && (
                        <p className="text-sm font-black text-blue-700 whitespace-nowrap">
                          ₺{job.agreed_price}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-1">
                      {job.service_categories?.name}{' '}
                      {job.job_type === 'urgent'
                        ? '• ⚡ Acil'
                        : job.job_type === 'scheduled'
                        ? '• 📅 Randevulu'
                        : ''}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      📍 {job.address}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.bg} ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>
                          {job.offerCount > 0
                            ? `💬 ${job.offerCount} teklif`
                            : 'Henüz teklif yok'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

