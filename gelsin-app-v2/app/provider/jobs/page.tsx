'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<Set<string>>(new Set())
  const [offering, setOffering] = useState<Record<string, { price: string; duration: string; message: string }>>({})
  const [submitting, setSubmitting] = useState('')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)

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
    const { data: j } = await supabase.from('jobs')
      .select('*, service_categories(name, icon, slug)')
      .eq('status', 'open').order('created_at', { ascending: false })
    setJobs(j || [])
    const { data: o } = await supabase.from('offers').select('job_id').eq('provider_id', user!.id)
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

    // Aynı ustanın aynı işe ikinci kez teklif vermesini engelle
    const { data: existing } = await supabase
      .from('offers')
      .select('id')
      .eq('job_id', jobId)
      .eq('provider_id', user.id)

    if (existing && existing.length > 0) {
      alert('Bu işe zaten teklif verdiniz.')
      setSubmitting('')
      return
    }

    // 1. Teklifi ekle
    const { error } = await supabase.from('offers').insert({
      job_id: jobId,
      provider_id: user.id,
      price: parseFloat(o.price),
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

    // 2. Bildirim gönder
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
    setOffering(p => { const n = {...p}; delete n[jobId]; return n })
    setSubmitting('')
  }

  const sorted = jobs.map(j => ({
    ...j,
    dist: userLat && userLng ? distKm(userLat, userLng, j.lat, j.lng) : null
  })).sort((a, b) => (a.dist ?? 99) - (b.dist ?? 99))

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="px-6 lg:px-10 py-6 sticky top-0 bg-slate-950/90 backdrop-blur-md z-40 border-b border-slate-800">
        <h1 className="text-xl lg:text-2xl font-black text-slate-50">🔍 Radar</h1>
        <p className="text-slate-400 text-sm mt-0.5">Yakınımdaki açık işler — en yakın önce</p>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-4">
        {sorted.map((job, i) => (
          <div
            key={job.id}
            className={`rounded-3xl p-[1px] animate-slide-up ${
              job.job_type === 'urgent'
                ? 'bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300'
                : 'bg-slate-800/60'
            }`}
            style={{ animationDelay: `${Math.min(i, 4) * 0.06}s` }}
          >
            <div className="bg-slate-950/90 lg:bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl shadow-black/40">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center text-xl text-sky-400">
                  {job.service_categories?.icon}
                </div>
                <div>
                  <p className="font-bold text-slate-50 text-sm">{job.title}</p>
                  <p className="text-xs text-slate-400">{job.service_categories?.name}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={
                    job.job_type === 'urgent'
                      ? 'badge-red'
                      : 'badge-blue'
                  }
                >
                  {job.job_type === 'urgent' ? '⚡ Acil' : '📅 Normal'}
                </span>
                {job.dist !== null && (
                  <span className={`text-xs font-bold ${job.dist < 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {job.dist < 1 ? `${(job.dist*1000).toFixed(0)}m` : `${job.dist.toFixed(1)}km`}
                  </span>
                )}
              </div>
            </div>

            {job.description && (
              <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl mb-3 border border-slate-800">
                {job.description}
              </p>
            )}
            <p className="text-xs text-slate-400 mb-4">📍 {job.address}</p>

            {offering[job.id] && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3 mb-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Fiyat (₺) *</label>
                    <input className="input text-sm py-2.5" type="number" placeholder="250"
                      value={offering[job.id]?.price}
                      onChange={e => setOffering(p => ({ ...p, [job.id]: { ...p[job.id], price: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Süre</label>
                    <input className="input text-sm py-2.5" placeholder="2 saat"
                      value={offering[job.id]?.duration}
                      onChange={e => setOffering(p => ({ ...p, [job.id]: { ...p[job.id], duration: e.target.value } }))} />
                  </div>
                </div>
                <textarea className="input text-sm py-2.5 resize-none" rows={2} placeholder="Müşteriye not..."
                  value={offering[job.id]?.message}
                  onChange={e => setOffering(p => ({ ...p, [job.id]: { ...p[job.id], message: e.target.value } }))} />
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-secondary py-2.5 text-sm"
                    onClick={() => setOffering(p => { const n={...p}; delete n[job.id]; return n })}>İptal</button>
                  <button className="btn-primary py-2.5 text-sm"
                    onClick={() => submitOffer(job.id)}
                    disabled={submitting === job.id || !offering[job.id]?.price}>
                    {submitting === job.id ? '⏳ Gönderiliyor...' : '📤 Gönder'}
                  </button>
                </div>
              </div>
            )}

            {myOffers.has(job.id) ? (
              <div className="badge-green w-full justify-center py-2.5 text-sm">✅ Teklif Verildi</div>
            ) : !offering[job.id] && (
              <button className="btn-primary py-3 text-sm w-full"
                onClick={() => setOffering(p => ({ ...p, [job.id]: { price: '', duration: '', message: '' } }))}>
                💬 Teklif Ver
              </button>
            )}
          </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="font-bold text-slate-700">Açık iş bulunamadı</p>
            <p className="text-sm text-slate-400 mt-1">Yeni işler gelince burada görünecek</p>
          </div>
        )}
      </div>
    </div>
  )
}
