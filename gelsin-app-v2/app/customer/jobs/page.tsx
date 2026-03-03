'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

export default function JobDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [job, setJob] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState('')
  const [showStartQR, setShowStartQR] = useState(false)
  const [showEndQR, setShowEndQR] = useState(false)
  const [generatingEnd, setGeneratingEnd] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const { data: j } = await supabase.from('jobs')
      .select('*, service_categories(name, icon)').eq('id', id).single()
    setJob(j)
    const { data: o } = await supabase.from('offers')
      .select('*, profiles(full_name, phone), provider_profiles(rating)')
      .eq('job_id', id).order('price', { ascending: true })
    setOffers(o || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const acceptOffer = async (offerId: string, providerId: string, price: number) => {
    setAccepting(offerId)
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId)
    await supabase.from('offers').update({ status: 'rejected' }).eq('job_id', id).neq('id', offerId)
    await supabase.from('jobs').update({
      provider_id: providerId, agreed_price: price, status: 'accepted', escrow_held: true
    }).eq('id', id)
    await supabase.from('notifications').insert({
      user_id: providerId,
      title: 'Teklifiniz Kabul Edildi!',
      body: 'Adrese gidin ve baslangic QR kodunu okutun.',
      type: 'offer_accepted',
      related_job_id: id
    })
    await load()
    setAccepting('')
  }

  const generateEndQR = async () => {
    setGeneratingEnd(true)
    const supabase = createClient()
    const endToken = crypto.randomUUID()
    await supabase.from('jobs').update({ end_qr_token: endToken }).eq('id', id)
    await load()
    setShowEndQR(true)
    setGeneratingEnd(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const startQrData = JSON.stringify({ job_id: job?.id, token: job?.qr_token, action: 'start' })
  const endQrData = JSON.stringify({ job_id: job?.id, token: job?.end_qr_token, action: 'end' })

  const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    open:      { label: 'Teklif Bekleniyor', bg: 'bg-blue-50',    color: 'text-blue-700',    border: 'border-blue-100' },
    offered:   { label: 'Teklif Geldi',      bg: 'bg-orange-50',  color: 'text-orange-700',  border: 'border-orange-100' },
    accepted:  { label: 'Usta Yolda',        bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-100' },
    started:   { label: 'Is Devam Ediyor',   bg: 'bg-orange-50',  color: 'text-orange-700',  border: 'border-orange-100' },
    completed: { label: 'Tamamlandi',        bg: 'bg-gray-50',    color: 'text-gray-600',    border: 'border-gray-100' },
  }
  const sc = statusConfig[job?.status] || statusConfig.open

  return (
    <div className="min-h-screen bg-[#F4F7FA]">

      {/* HEADER */}
      <header className="px-6 lg:px-10 py-6 flex items-center gap-4 sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <button onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all font-bold">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-slate-800 text-lg truncate">{job?.title}</h1>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.color} ${sc.border}`}>
            {sc.label}
          </span>
        </div>
        <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
          {job?.service_categories?.icon}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SOL - İş Detayları + QR */}
          <div className="space-y-4">

            {/* İş Bilgileri */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">İş Detayları</p>
              <div className="space-y-3">
                {job?.description && (
                  <p className="text-slate-600 text-sm leading-relaxed">{job.description}</p>
                )}
                <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
                  <span className="text-slate-400 text-sm mt-0.5 shrink-0">📍</span>
                  <p className="text-slate-700 text-sm">{job?.address}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                  <span className="text-slate-400 text-sm">🏷️</span>
                  <p className="text-slate-700 text-sm font-medium">{job?.service_categories?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">{job?.job_type === 'urgent' ? '⚡' : '📅'}</span>
                  <p className="text-slate-700 text-sm font-medium">{job?.job_type === 'urgent' ? 'Acil' : 'Randevulu'}</p>
                </div>
                {job?.agreed_price && (
                  <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-xl mt-2">
                    <span className="text-slate-600 text-sm font-medium">Anlasilan Fiyat</span>
                    <span className="text-blue-700 font-black text-xl">₺{job.agreed_price}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Baslangic QR - accepted */}
            {job?.status === 'accepted' && (
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📱</div>
                  <div>
                    <p className="font-black text-slate-800">Baslangic QR Kodu</p>
                    <p className="text-xs text-slate-400">Usta gelince gosterin</p>
                  </div>
                </div>
                {showStartQR ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-inner">
                      <QRCodeSVG value={startQrData} size={180} level="H" />
                    </div>
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-mono text-2xl font-black tracking-[0.3em]">
                      {job?.qr_token?.slice(-6).toUpperCase()}
                    </div>
                    <p className="text-xs text-slate-400 text-center">QR veya PIN ile usta isi baslatir</p>
                    {job?.qr_scanned_at && (
                      <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl py-3 text-center">
                        <p className="text-sm font-bold text-emerald-700">Is Basladi — {new Date(job.qr_scanned_at).toLocaleTimeString('tr-TR')}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold transition-all"
                    onClick={() => setShowStartQR(true)}>
                    QR Kodunu Goster
                  </button>
                )}
              </div>
            )}

            {/* Bitis QR - started */}
            {job?.status === 'started' && (
              <div className="bg-white rounded-2xl p-6 border-2 border-emerald-200 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">🏁</div>
                  <div>
                    <p className="font-black text-slate-800">Is Tamamlandi mi?</p>
                    <p className="text-xs text-slate-400">Onaylayin, bitis QR uretilsin</p>
                  </div>
                </div>
                {showEndQR && job?.end_qr_token ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100 shadow-inner">
                      <QRCodeSVG value={endQrData} size={180} level="H" />
                    </div>
                    <div className="bg-emerald-700 text-white px-6 py-3 rounded-2xl font-mono text-2xl font-black tracking-[0.3em]">
                      {job?.end_qr_token?.slice(-6).toUpperCase()}
                    </div>
                    <p className="text-xs text-slate-400 text-center">Usta okutunca odeme cuzdanina aktarilir</p>
                  </div>
                ) : (
                  <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold transition-all"
                    onClick={generateEndQR} disabled={generatingEnd}>
                    {generatingEnd ? 'Hazirlaniyor...' : 'Onayla & Bitis QR Uret'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* SAG - Teklifler */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-800">
                Teklifler
                {offers.length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-700 text-sm px-2.5 py-0.5 rounded-full font-bold">{offers.length}</span>
                )}
              </h2>
            </div>

            {offers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                <div className="text-6xl mb-4">⏳</div>
                <p className="font-black text-slate-700 text-lg">Teklif Bekleniyor</p>
                <p className="text-slate-400 text-sm mt-2">Yakin ustalar bildirim aldi, beklemeye devam edin</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map(offer => (
                  <div key={offer.id} className={`bg-white rounded-2xl p-6 border-2 shadow-sm transition-all ${
                    offer.status === 'accepted' ? 'border-emerald-400 shadow-emerald-100' :
                    offer.status === 'rejected' ? 'border-slate-100 opacity-50' :
                    'border-slate-100 hover:border-blue-200 hover:shadow-md'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center text-xl text-white font-black">
                          {offer.profiles?.full_name?.charAt(0)?.toUpperCase() || '👷'}
                        </div>
                        <div>
                          <p className="font-black text-slate-800">{offer.profiles?.full_name || 'Usta'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {offer.provider_profiles?.rating && (
                              <span className="text-xs font-bold text-amber-600">★ {offer.provider_profiles.rating}</span>
                            )}
                            <span className="text-xs text-slate-400">{offer.profiles?.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-blue-700">₺{offer.price}</p>
                        {offer.estimated_duration && (
                          <p className="text-xs text-slate-400 mt-0.5">⏱ {offer.estimated_duration}</p>
                        )}
                      </div>
                    </div>

                    {offer.message && (
                      <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                        <p className="text-sm text-slate-600 leading-relaxed">"{offer.message}"</p>
                      </div>
                    )}

                    {offer.status === 'pending' && job?.status !== 'accepted' && job?.status !== 'started' && (
                      <button
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5"
                        onClick={() => acceptOffer(offer.id, offer.provider_id, offer.price)}
                        disabled={!!accepting}>
                        {accepting === offer.id ? 'Isleniyor...' : 'Bu Teklifi Kabul Et →'}
                      </button>
                    )}
                    {offer.status === 'accepted' && (
                      <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl py-3 text-center">
                        <p className="text-sm font-bold text-emerald-700">Kabul Edildi</p>
                      </div>
                    )}
                    {offer.status === 'rejected' && (
                      <div className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 text-center">
                        <p className="text-sm font-bold text-slate-400">Reddedildi</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
