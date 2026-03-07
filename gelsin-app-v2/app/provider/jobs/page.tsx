'use client'
import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
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

function ProviderJobsPageContent() {
  const [jobs, setJobs] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<Set<string>>(new Set())
  const [myOfferMeta, setMyOfferMeta] = useState<Record<string, { offerId: string; is_bargain_requested: boolean }>>({})
  const [offering, setOffering] = useState<Record<string, { price: string; duration: string; message: string }>>({})
  const [submitting, setSubmitting] = useState('')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const bargainHandledRef = useRef(false)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      setUserLat(p.coords.latitude)
      setUserLng(p.coords.longitude)
    })
    load()
  }, [])

  // KURAL 3: Bildirimden "pazarlık" ile gelindiğinde iş modalını + teklif güncelleme formunu aç
  useEffect(() => {
    const bargainJobId = searchParams.get('bargain')
    if (!bargainJobId || bargainHandledRef.current) return
    bargainHandledRef.current = true
    setSelectedJobId(bargainJobId)
    const t = setTimeout(() => {
      openEditOffer(bargainJobId)
      window.history.replaceState({}, '', '/provider/jobs')
    }, 500)
    return () => clearTimeout(t)
  }, [searchParams])

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

    // KURAL 4: Mevcut teklif varsa sadece UPDATE (asla ikinci satır INSERT etme)
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
          is_bargain_requested: false,
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

    setMyOfferMeta((prev) => {
      const next = { ...prev }
      if (next[jobId]) next[jobId] = { ...next[jobId], is_bargain_requested: false }
      return next
    })
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
    <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden w-full max-w-full">
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-slate-200">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900">🔍 Radar</h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-0.5">Yakınımdaki açık işler</p>

        {/* Filtreler: mobilde satıra sığdır (wrap), taşma yok */}
        <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
          {chips.map((c) => {
            const active = filter === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 whitespace-nowrap ${
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

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-32 lg:pb-6 overflow-hidden">
        <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-full">
          {filtered.map((job, i) => {
            const urgent = job.job_type === 'urgent'
            const distText = job.dist != null
              ? job.dist < 1
                ? `${(job.dist * 1000).toFixed(0)}m`
                : `${job.dist.toFixed(1)}km`
              : null
            const time = whenLabel(job)

            return (
              <div
                key={job.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedJobId(job.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedJobId(job.id)
                }}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden animate-slide-up w-full max-w-full"
                style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
              >
                <div className="p-3 sm:p-4 md:p-5 overflow-hidden">
                  {/* Mobil: Kompakt üst satır (ikon + başlık + rozet) */}
                  <div className="flex items-start gap-3 mb-2 overflow-hidden">
                    {/* İkon */}
                    <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl md:text-3xl text-blue-600 flex-shrink-0">
                      {job.service_categories?.icon || '🔧'}
                    </div>

                    {/* Başlık ve kategori */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base md:text-lg leading-snug line-clamp-2 break-words">
                            {job.title}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{job.service_categories?.name}</p>
                        </div>
                        {/* Rozet: Acil veya Teklif Verildi (KURAL 1) */}
                        {myOffers.has(job.id) && (
                          <span className="flex-shrink-0 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            ✅ Teklif Verildi - Müşteri Yanıtı Bekleniyor
                          </span>
                        )}
                        {urgent && !myOffers.has(job.id) && (
                          <span className="flex-shrink-0 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            🔥 Acil
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Açıklama - 2 satır */}
                  {job.description && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 mb-2 sm:mb-3 break-words overflow-hidden">
                      {job.description}
                    </p>
                  )}

                  {/* Alt satır: Lokasyon ve zaman */}
                  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-slate-500 pt-2 border-t border-gray-100 overflow-hidden">
                    {job.address && (
                      <span className="inline-flex items-center gap-1 max-w-[60%] overflow-hidden">
                        <span className="flex-shrink-0">📍</span>
                        <span className="truncate">{job.address}</span>
                      </span>
                    )}
                    {time && (
                      <span className="inline-flex items-center gap-1 flex-shrink-0">
                        <span>🕒</span>
                        <span>{time.replace(/^[📅⏱]\s*/, '')}</span>
                      </span>
                    )}
                    {distText && (
                      <span className="inline-flex items-center gap-1 text-blue-600 font-semibold flex-shrink-0">
                        <span>📏</span>
                        <span>{distText}</span>
                      </span>
                    )}
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
                  {myOfferMeta[selectedJob.id]?.is_bargain_requested === true && (
                    <>
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5">
                        Müşteri indirim bekliyor
                      </p>
                      <button
                        className="btn-secondary py-2 text-xs w-full"
                        onClick={() => openEditOffer(selectedJob.id)}
                      >
                        📉 Müşteri İndirim Bekliyor - Teklifi Güncelle
                      </button>
                    </>
                  )}
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
                      type="button"
                      className="btn-secondary py-2 text-xs"
                      onClick={() => {
                        setOffering((p) => {
                          const n = { ...p }
                          delete n[selectedJob.id]
                          return n
                        })
                        setSelectedJobId(null)
                      }}
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

export default function ProviderJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProviderJobsPageContent />
    </Suspense>
  )
}
