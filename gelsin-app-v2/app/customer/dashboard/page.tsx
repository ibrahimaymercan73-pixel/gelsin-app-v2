'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, Bell, Plus, FileText, ChevronRight } from 'lucide-react'
import { useNotifications } from '@/components/NotificationProvider'

type TabKey = 'active' | 'offers' | 'done'

type JobWithMeta = {
  id: string
  title: string
  status: string
  created_at: string
  agreed_price: number | null
  offerCount: number
  hasAcceptedOffer: boolean
}

type VitrinItem = {
  id: string
  title: string
  price: number
  image_url: string | null
  provider_name: string
  provider_rating: number | null
  category_slug: string
}

type ActivityItem = {
  id: string
  title: string
  body: string | null
  created_at: string
  related_job_id: string | null
}

const TAB_CONFIG: Record<TabKey, { label: string }> = {
  active: { label: 'Aktif' },
  offers: { label: 'Teklif Bekleyen' },
  done: { label: 'Tamamlanan' },
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  open: { label: 'Teklif Bekleniyor', className: 'bg-blue-100 text-blue-700' },
  offered: { label: 'Teklif Geldi', className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Uzman Atandı', className: 'bg-emerald-100 text-emerald-700' },
  started: { label: 'Devam Ediyor', className: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Tamamlandı', className: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'İptal', className: 'bg-red-100 text-red-700' },
  disputed: { label: 'Uyuşmazlık', className: 'bg-amber-100 text-amber-700' },
}

function deriveBucket(job: JobWithMeta): TabKey {
  const s = job.status || 'open'
  if (s === 'completed' || s === 'cancelled' || s === 'disputed') return 'done'
  if (s === 'accepted' || s === 'started') return 'active'
  return 'offers'
}

function getStatusKey(job: JobWithMeta): string {
  const s = job.status || 'open'
  if (job.offerCount > 0 && s === 'open') return 'offered'
  return s
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const { unreadNotificationCount } = useNotifications()
  const [userName, setUserName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [jobs, setJobs] = useState<JobWithMeta[]>([])
  const [vitrin, setVitrin] = useState<VitrinItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('offers')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const [profileRes, jobsRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('jobs').select('id, title, status, created_at, agreed_price').eq('customer_id', user.id).order('created_at', { ascending: false }),
      ])
      setUserName(profileRes.data?.full_name?.trim() || '')
      const jobRows = (jobsRes.data || []) as any[]
      const jobIds = jobRows.map((j) => j.id)

      let offersByJob: Record<string, { total: number; hasAccepted: boolean }> = {}
      if (jobIds.length > 0) {
        const { data: offers } = await supabase.from('offers').select('job_id, status').in('job_id', jobIds)
        for (const o of offers || []) {
          const jid = o.job_id as string
          if (!offersByJob[jid]) offersByJob[jid] = { total: 0, hasAccepted: false }
          offersByJob[jid].total += 1
          if (o.status === 'accepted') offersByJob[jid].hasAccepted = true
        }
      }

      setJobs(
        jobRows.map((j) => ({
          id: j.id,
          title: j.title,
          status: j.status,
          created_at: j.created_at,
          agreed_price: j.agreed_price ?? null,
          offerCount: offersByJob[j.id]?.total ?? 0,
          hasAcceptedOffer: offersByJob[j.id]?.hasAccepted ?? false,
        }))
      )

      const { data: serviceRows } = await supabase
        .from('provider_services')
        .select('id, title, price, image_url, provider_id, category_slug')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8)
      if (serviceRows?.length) {
        const pids = Array.from(new Set(serviceRows.map((r: any) => r.provider_id)))
        const { data: profiles } = await supabase.from('profiles_public').select('id, full_name').in('id', pids)
        const { data: pp } = await supabase.from('provider_profiles').select('id, rating').in('id', pids)
        const nameBy: Record<string, string> = {}
        const ratingBy: Record<string, number> = {}
        for (const p of profiles || []) nameBy[p.id] = p.full_name || 'Uzman'
        for (const x of pp || []) ratingBy[x.id] = Number(x.rating) || 0
        setVitrin(
          serviceRows.map((r: any) => ({
            id: r.id,
            title: r.title,
            price: r.price,
            image_url: r.image_url,
            provider_name: nameBy[r.provider_id] || 'Uzman',
            provider_rating: ratingBy[r.provider_id] ?? null,
            category_slug: r.category_slug || 'repair',
          }))
        )
      }

      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, title, body, created_at, related_job_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setActivities((notifs || []) as ActivityItem[])
      setLoading(false)
    }
    load()
  }, [])

  const grouped: Record<TabKey, JobWithMeta[]> = { active: [], offers: [], done: [] }
  for (const job of jobs) {
    const bucket = deriveBucket(job)
    grouped[bucket].push(job)
  }
  const displayJobs = grouped[activeTab]

  const handleSearch = () => {
    if (searchQuery.trim()) router.push(`/customer/providers?q=${encodeURIComponent(searchQuery.trim())}`)
    else router.push('/customer/providers')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EBEBEB]">
        <div className="w-10 h-10 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EBEBEB] flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-50 bg-[#F5F5F5] border-b border-[#D8D8D8] px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="text-lg font-bold text-slate-800 hidden sm:inline">GELSİN.</span>
        <div className="flex-1 max-w-md">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Uzman veya hizmet ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-[#D0D0D0] bg-[#EBEBEB] text-slate-800 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={handleSearch} className="h-9 px-3 rounded-lg bg-slate-200 hover:bg-slate-300">
              <Search className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Link href="/customer/notifications" className="relative h-9 w-9 rounded-lg bg-[#EBEBEB] border border-[#D0D0D0] flex items-center justify-center hover:bg-slate-200">
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </Link>
          <Link href="/customer/new-job" className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Yeni İş Talebi
          </Link>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
        {/* Hero */}
        <section className="rounded-2xl bg-slate-300 h-24 md:h-28 flex items-center justify-between px-6 md:px-8 mb-5">
          <div>
            <span className="inline-block text-xs font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full mb-2">Müşteri Paneli</span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Merhaba {userName || 'Misafir'}</h1>
            <p className="text-sm text-slate-600 mt-0.5">İhtiyacını yaz, uzmanlardan teklif al.</p>
          </div>
          <Link href="/customer/new-job" className="h-10 px-5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Yeni Talep
          </Link>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#ECECEC] border border-[#D0D0D0] w-fit mb-4">
          {(Object.keys(TAB_CONFIG) as TabKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key ? 'bg-slate-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {TAB_CONFIG[key].label}
            </button>
          ))}
        </div>

        {/* İşlerim grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {displayJobs.length === 0 ? (
            <div className="col-span-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-100/80 p-8 flex flex-col items-center justify-center gap-3 min-h-[140px]">
              <p className="text-slate-600 font-medium">Bu kategoride iş yok</p>
              <Link href="/customer/new-job" className="text-sm text-blue-600 font-semibold hover:underline">+ Yeni İş Talebi Oluştur</Link>
            </div>
          ) : (
            displayJobs.slice(0, 6).map((job) => {
              const statusKey = getStatusKey(job)
              const badge = STATUS_BADGE[statusKey] || STATUS_BADGE.open
              return (
                <div key={job.id} className="rounded-xl bg-[#F5F5F5] border border-[#D8D8D8] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-[#D0D0D0] flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${badge.className}`}>{badge.label}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm line-clamp-2">{job.title}</h3>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-500">{job.offerCount} teklif</span>
                    <Link href={`/customer/jobs/${job.id}`} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
                      Teklifleri Gör <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })
          )}
          {displayJobs.length > 0 && displayJobs.length < 6 && (
            <Link href="/customer/new-job" className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-100/50 flex flex-col items-center justify-center gap-2 min-h-[140px] hover:bg-slate-200/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center"><Plus className="w-5 h-5 text-slate-600" /></div>
              <span className="text-sm font-medium text-slate-600">Yeni talep</span>
            </Link>
          )}
        </div>

        {/* İki kolon: Uzman İlanları | Son Aktiviteler */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Uzman İlanları</h2>
              <Link href="/customer" className="text-xs font-semibold text-blue-600 hover:underline">Tümü</Link>
            </div>
            <div className="flex flex-col gap-2">
              {vitrin.length === 0 ? (
                <div className="rounded-xl bg-[#F5F5F5] border border-[#D8D8D8] p-6 text-center text-sm text-slate-500">Henüz ilan yok</div>
              ) : (
                vitrin.slice(0, 5).map((s) => (
                  <Link key={s.id} href={`/customer/services/${s.id}`} className="rounded-xl bg-[#F5F5F5] border border-[#D8D8D8] p-3 flex gap-3 items-center hover:bg-slate-100 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                      {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🔧</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{s.title}</p>
                      <p className="text-xs text-slate-500">{s.provider_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-blue-600 text-sm">₺{Number(s.price).toFixed(0)}</p>
                      {s.provider_rating != null && <p className="text-xs text-amber-600">★ {s.provider_rating.toFixed(1)}</p>}
                      <span className="inline-block mt-1 text-xs font-semibold text-blue-600">Hemen Çağır</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Son Aktiviteler</h2>
              <Link href="/customer/notifications" className="text-xs font-semibold text-blue-600 hover:underline">Tümü</Link>
            </div>
            <div className="rounded-xl bg-[#F5F5F5] border border-[#D8D8D8] overflow-hidden">
              {activities.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Henüz aktivite yok</div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {activities.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <Link href={a.related_job_id ? `/customer/jobs/${a.related_job_id}` : '/customer/notifications'} className="flex items-start gap-2 p-3 hover:bg-slate-100 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 text-sm">🔔</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{a.title}</p>
                          {a.body && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{a.body}</p>}
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(a.created_at).toLocaleString('tr-TR')}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
