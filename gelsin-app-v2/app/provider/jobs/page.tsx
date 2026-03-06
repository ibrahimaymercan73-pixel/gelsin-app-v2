 'use client'
import { useEffect, useState } from 'react'
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

export default function ProviderJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<Set<string>>(new Set())
  const [offering, setOffering] = useState<Record<string, { price: string; duration: string; message: string }>>({})
  const [submitting, setSubmitting] = useState('')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      setUserLat(p.coords.latitude)
      setUserLng(p.coords.longitude)
    })
    load()
  }, [])

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
      .select('service_categories')
      .eq('id', user.id)
      .single()
    setSkills(Array.isArray(pp?.service_categories) ? (pp!.service_categories as string[]) : [])

    const { data: j } = await supabase.from('jobs')
      .select('*, service_categories(name, icon, slug)')
      .eq('status', 'open').order('created_at', { ascending: false })
    setJobs(j || [])
    const { data: o } = await supabase.from('offers').select('job_id').eq('provider_id', user.id)
    const ids = new Set(Array.from((o || []).map((x: any) => x.job_id as string)))
    setMyOffers(ids)
  }

  const distKm = (la1: number, lo1: number, la2: number, lo2: number) => {
    const R = 6371, dLat = (la2-la1)*Math.PI/180, dLon = (lo2-lo1)*Math.PI/180
    const a = Math.sin(dLat/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const submitOffer = async (jobId: string) => {
    const o = offering[jobId]
    if (!o?.price) return
    setSubmitting(jobId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Teklif verebilmek için tekrar giriş yapın.')
      setSubmitting('')
      return
    }

    const newPrice = parseFloat(o.price)
    if (Number.isNaN(newPrice) || newPrice <= 0) {
      alert('Lütfen geçerli bir fiyat girin.')
      setSubmitting('')
      return
    }

    // Bu işe daha önce verilmiş teklif var mı? (varsa pazarlık sonrası güncelle)
    const { data: existing } = await supabase
      .from('offers')
      .select('id, price')
      .eq('job_id', jobId)
      .eq('provider_id', user.id)

    if (existing && existing.length > 0) {
      const current = existing[0]
      const currentPrice = Number(current.price || 0)
      if (newPrice >= currentPrice) {
        alert('Pazarlık için yeni fiyat mevcut fiyattan daha düşük olmalı.')
        setSubmitting('')
        return
      }

      const { error: updateError } = await supabase
        .from('offers')
        .update({
          price: newPrice,
          estimated_duration: o.duration,
          message: o.message,
        })
        .eq('id', current.id)

      if (updateError) {
        alert('Teklif güncellenirken bir hata oluştu: ' + updateError.message)
        setSubmitting('')
        return
      }
    } else {
      // İlk kez teklif veriliyorsa insert
      const { error } = await supabase.from('offers').insert({
        job_id: jobId,
        provider_id: user.id,
        price: newPrice,
        estimated_duration: o.duration,
        message: o.message,
      })

      if (error) {
        if ((error as any).code === '23505') {
          alert('Bu işe zaten teklif verdiniz.')
        } else {
          alert('Teklif kaydedilirken bir hata oluştu: ' + error.message)
        }
        setSubmitting('')
        return
      }

      // Yeni teklif için bildirim gönder
      const job = jobs.find(j => j.id === jobId)
      await supabase.from('notifications').insert({
        user_id: job?.customer_id,
        title: '💬 Yeni Teklif!',
        body: `"${job?.title}" işine yeni teklif geldi.`,
        type: 'new_offer',
        related_job_id: jobId
      })

      const next = new Set(Array.from(myOffers))
      next.add(jobId)
      setMyOffers(next)
    }

    setOffering(p => { const n = {...p}; delete n[jobId]; return n })
    setSubmitting('')
  }

  const openEditOffer = async (jobId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('offers')
      .select('price, estimated_duration, message')
      .eq('job_id', jobId)
      .eq('provider_id', user!.id)
      .single()

    if (error || !data) {
      alert('Mevcut teklif bulunamadı.')
      return
    }

    setOffering(p => ({
      ...p,
      [jobId]: {
        price: data.price != null ? String(data.price) : '',
        duration: data.estimated_duration || '',
        message: data.message || '',
      },
    }))
  }

  const chips = [
    { id: 'all', label: 'Tümü' },
    { id: 'urgent', label: '🔥 Acil İşler' },
    { id: 'nearby', label: '📍 Yakınımdakiler' },
    ...skills.map((s) => ({
      id: `cat:${s}`,
      label: SKILL_LABELS[s] || s,
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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="px-6 lg:px-10 py-6 sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-slate-200">
        <h1 className="text-xl lg:text-2xl font-black text-slate-900">🔍 Radar</h1>
        <p className="text-slate-600 text-sm mt-0.5">Yakınımdaki açık işler — en yakın önce</p>

        {/* Filters */}
        <div className="mt-4 -mx-2 px-2 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1">
          {chips.map((c) => {
            const active = filter === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {filtered.map((job, i) => {
            const urgent = job.job_type === 'urgent'
            const badgeText = urgent
              ? '⚡ Acil'
              : job.dist != null
              ? job.dist < 1
                ? `${(job.dist * 1000).toFixed(0)}m`
                : `${job.dist.toFixed(1)}km`
              : 'İş'
            const time = whenLabel(job)

            return (
              <div
                key={job.id}
                className="animate-slide-up h-full"
                style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedJobId(job.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedJobId(job.id)
                  }}
                  className="group flex flex-col h-full bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all cursor-pointer outline-none overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl text-blue-600 flex-shrink-0">
                        {job.service_categories?.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{job.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{job.service_categories?.name}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                        urgent
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {badgeText}
                    </span>
                  </div>

                  {job.description && (
                    <p className="mt-2 text-[13px] text-slate-600 leading-snug line-clamp-2">
                      {job.description}
                    </p>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {time && (
                        <p className="text-[11px] text-slate-500 font-medium">{time}</p>
                      )}
                      <p className="text-[11px] text-slate-500 truncate">📍 {job.address}</p>
                    </div>

                    <button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1 flex-shrink-0 transition-colors"
                    >
                      <span>İşi İncele</span>
                      <span>➔</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {jobs.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="font-bold text-slate-700">Açık iş bulunamadı</p>
            <p className="text-sm text-slate-400 mt-1">Yeni işler gelince burada görünecek</p>
          </div>
        )}
      </div>

      {/* Job Detail / Offer Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-3xl p-4 max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl text-blue-600 flex-shrink-0">
                  {selectedJob.service_categories?.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-base truncate">{selectedJob.title}</p>
                  <p className="text-xs text-slate-600 truncate">{selectedJob.service_categories?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedJobId(null)
                  setOffering((p) => {
                    const n = { ...p }
                    if (selectedJobId) delete n[selectedJobId]
                    return n
                  })
                }}
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

              {myOffers.has(selectedJob.id) && !offering[selectedJob.id] ? (
                <div className="space-y-2">
                  <div className="badge-green w-full justify-center py-2 text-sm">✅ Teklif Verildi</div>
                  <button
                    className="btn-secondary py-2 text-xs w-full"
                    onClick={() => openEditOffer(selectedJob.id)}
                  >
                    🤝 Pazarlık Sonrası Fiyatı Düşür
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">Fiyat (₺) *</label>
                      <input
                        className="input text-sm py-2 bg-gray-50 border border-gray-200"
                        type="number"
                        placeholder="250"
                        value={offering[selectedJob.id]?.price || ''}
                        onChange={(e) =>
                          setOffering((p) => ({
                            ...p,
                            [selectedJob.id]: { ...(p[selectedJob.id] || { price: '', duration: '', message: '' }), price: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">Süre</label>
                      <input
                        className="input text-sm py-2 bg-gray-50 border border-gray-200"
                        placeholder="2 saat"
                        value={offering[selectedJob.id]?.duration || ''}
                        onChange={(e) =>
                          setOffering((p) => ({
                            ...p,
                            [selectedJob.id]: { ...(p[selectedJob.id] || { price: '', duration: '', message: '' }), duration: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <textarea
                    className="input text-sm py-2 mt-2 resize-none bg-gray-50 border border-gray-200"
                    rows={2}
                    placeholder="Müşteriye not..."
                    value={offering[selectedJob.id]?.message || ''}
                    onChange={(e) =>
                      setOffering((p) => ({
                        ...p,
                        [selectedJob.id]: { ...(p[selectedJob.id] || { price: '', duration: '', message: '' }), message: e.target.value },
                      }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      className="btn-secondary py-2 text-xs"
                      onClick={() =>
                        setOffering((p) => {
                          const n = { ...p }
                          delete n[selectedJob.id]
                          return n
                        })
                      }
                    >
                      İptal
                    </button>
                    <button
                      className="btn-primary py-2 text-xs"
                      onClick={() => submitOffer(selectedJob.id)}
                      disabled={submitting === selectedJob.id || !offering[selectedJob.id]?.price}
                    >
                      {submitting === selectedJob.id ? '⏳ Gönderiliyor...' : '📤 Gönder'}
                    </button>
                  </div>
                </>
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
