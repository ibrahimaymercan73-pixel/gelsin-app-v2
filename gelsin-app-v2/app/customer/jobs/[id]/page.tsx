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

    const { data: j } = await supabase
      .from('jobs')
      .select('*, service_categories(name, icon)')
      .eq('id', id)
      .single()

    setJob(j)

    const { data: offerRows } = await supabase
      .from('offers')
      .select('id, job_id, provider_id, price, estimated_duration, message, status')
      .eq('job_id', id)
      .order('price', { ascending: true })

    const offersList = (offerRows || []) as any[]
    const providerIds = Array.from(
      new Set(
        offersList
          .map((o) => o.provider_id as string | null)
          .filter((x): x is string => !!x)
      )
    )

    let profilesById: Record<string, any> = {}
    let providerProfilesById: Record<string, any> = {}

    if (providerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', providerIds)

      profilesById = Object.fromEntries(
        (profiles || []).map((p: any) => [p.id as string, p])
      )

      const { data: providerProfiles } = await supabase
        .from('provider_profiles')
        .select('id, rating')
        .in('id', providerIds)

      providerProfilesById = Object.fromEntries(
        (providerProfiles || []).map((p: any) => [p.id as string, p])
      )
    }

    const enrichedOffers = offersList.map((o) => ({
      ...o,
      profiles: profilesById[o.provider_id as string] || null,
      provider_profiles: providerProfilesById[o.provider_id as string] || null,
    }))

    setOffers(enrichedOffers)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`job-${id}-offers`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `job_id=eq.${id}` },
        () => {
          load()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${id}` },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const acceptOffer = async (offerId: string, providerId: string, price: number) => {
    setAccepting(offerId)
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId)
    await supabase.from('offers').update({ status: 'rejected' }).eq('job_id', id).neq('id', offerId)
    await supabase.from('jobs').update({
      provider_id: providerId, agreed_price: price, status: 'accepted', escrow_held: true
    }).eq('id', id)
    await supabase.from('notifications').insert({
      user_id: providerId, title: '🎉 Teklifiniz Kabul Edildi!',
      body: 'Adrese gidin ve başlangıç QR kodunu okutun.',
      type: 'offer_accepted', related_job_id: id
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

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  const startQrData = JSON.stringify({ job_id: job?.id, token: job?.qr_token, action: 'start' })
  const endQrData = JSON.stringify({ job_id: job?.id, token: job?.end_qr_token, action: 'end' })

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: '📢 Teklif Bekleniyor', bg: 'bg-blue-50', color: 'text-blue-700' },
    offered: { label: '💬 Teklif Geldi', bg: 'bg-orange-50', color: 'text-orange-700' },
    accepted: { label: '🚗 Usta Yolda', bg: 'bg-emerald-50', color: 'text-emerald-700' },
    started: { label: '🔨 İş Devam Ediyor', bg: 'bg-orange-50', color: 'text-orange-700' },
    completed: { label: '✅ Tamamlandı', bg: 'bg-gray-50', color: 'text-gray-600' },
  }

  const rawStatus = (job?.status as string) || 'open'
  const hasOffers = offers.length > 0
  const statusKey = hasOffers && rawStatus === 'open' ? 'offered' : rawStatus
  const sc = statusConfig[statusKey] || statusConfig.open

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <button onClick={() => router.back()} className="text-blue-600 font-semibold text-sm mb-4 flex items-center gap-1">
          ← Geri
        </button>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
            {job?.service_categories?.icon}
          </div>
          <div className="flex-1">
            <h1 className="font-black text-gray-900 text-lg">{job?.title}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${sc.bg} ${sc.color}`}>
              {sc.label}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Başlangıç QR — accepted durumunda */}
        {job?.status === 'accepted' && (
          <div className="card p-5 border-2 border-blue-200 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📱</div>
              <div>
                <p className="font-bold text-gray-900">Başlangıç QR Kodu</p>
                <p className="text-xs text-gray-500">Usta gelince gösterin — kodu okutmadan iş başlamaz</p>
              </div>
            </div>
            {showStartQR ? (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-4 rounded-2xl border-2 border-blue-100">
                  <QRCodeSVG value={startQrData} size={180} level="H"
                    imageSettings={{ src: '', height: 0, width: 0, excavate: false }} />
                </div>
                <div className="bg-gray-900 text-white px-6 py-2.5 rounded-2xl font-mono text-2xl font-black tracking-[0.3em]">
                  {job?.qr_token?.slice(-6).toUpperCase()}
                </div>
                <p className="text-xs text-gray-400 text-center">QR veya PIN'i ustayla paylaşın</p>
                {job?.qr_scanned_at && (
                  <div className="badge-green w-full justify-center py-2.5 text-sm">
                    ✅ İş Başladı — {new Date(job.qr_scanned_at).toLocaleTimeString('tr-TR')}
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-primary" onClick={() => setShowStartQR(true)}>
                📱 QR Kodunu Göster
              </button>
            )}
          </div>
        )}

        {/* Bitiş QR — started durumunda */}
        {job?.status === 'started' && (
          <div className="card p-5 border-2 border-emerald-200 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">🏁</div>
              <div>
                <p className="font-bold text-gray-900">İş Tamamlandı mı?</p>
                <p className="text-xs text-gray-500">Onaylayın, bitiş QR'ı üretin, ustayla taratın</p>
              </div>
            </div>
            {showEndQR && job?.end_qr_token ? (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100">
                  <QRCodeSVG value={endQrData} size={180} level="H"
                    imageSettings={{ src: '', height: 0, width: 0, excavate: false }} />
                </div>
                <div className="bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-mono text-2xl font-black tracking-[0.3em]">
                  {job?.end_qr_token?.slice(-6).toUpperCase()}
                </div>
                <p className="text-xs text-gray-400 text-center">Usta okutunca ödeme cüzdanına aktarılır</p>
              </div>
            ) : (
              <button className="btn-success" onClick={generateEndQR} disabled={generatingEnd}>
                {generatingEnd ? 'Hazırlanıyor...' : '✅ Onayla & Bitiş QR Üret'}
              </button>
            )}
          </div>
        )}

        {/* İş detayları */}
        <div className="card p-4 space-y-3">
          {job?.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{job.description}</p>
          )}
          <div className="flex items-start gap-2">
            <span className="text-gray-400 text-sm mt-0.5">📍</span>
            <p className="text-gray-700 text-sm flex-1">{job?.address}</p>
          </div>
          {job?.agreed_price && (
            <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-xl">
              <span className="text-gray-600 text-sm font-medium">Anlaşılan Fiyat</span>
              <span className="text-blue-700 font-black text-xl">₺{job.agreed_price}</span>
            </div>
          )}
        </div>

        {/* Teklifler */}
        {offers.length > 0 && (
          <div>
            <p className="font-bold text-gray-800 mb-3">Teklifler ({offers.length})</p>
            <div className="space-y-2">
              {offers.map(offer => (
                <div key={offer.id} className={`card p-4 ${
                  offer.status === 'accepted' ? 'border-2 border-emerald-400' :
                  offer.status === 'rejected' ? 'opacity-50' : ''
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
                        {offer.profiles?.full_name?.charAt(0)?.toUpperCase() || '👷'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {offer.profiles?.full_name || 'İsimsiz Usta'}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                          <span className="text-yellow-400 text-xs">★</span>
                          <span className="text-xs">
                            {offer.provider_profiles?.rating ?? 'Puan yok'}
                          </span>
                          <span className="mx-1">•</span>
                          <span className="text-xs">
                            {offer.profiles?.phone || 'Telefon yok'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-700">₺{offer.price}</p>
                      {offer.estimated_duration && (
                        <p className="text-xs text-gray-400">⏱ {offer.estimated_duration}</p>
                      )}
                    </div>
                  </div>
                  {offer.message && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl mb-3">{offer.message}</p>
                  )}
                  {offer.status === 'pending' && job?.status !== 'accepted' && job?.status !== 'started' && (
                    <button className="btn-primary py-3 text-sm"
                      onClick={() => acceptOffer(offer.id, offer.provider_id, offer.price)}
                      disabled={!!accepting}>
                      {accepting === offer.id ? 'İşleniyor...' : '✅ Bu Teklifi Kabul Et'}
                    </button>
                  )}
                  {offer.status === 'accepted' && (
                    <div className="badge-green w-full justify-center py-2">✅ Kabul Edildi</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {offers.length === 0 && job?.status === 'open' && (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-3">⏳</div>
            <p className="font-bold text-gray-700">Teklif bekleniyor...</p>
            <p className="text-xs text-gray-400 mt-1">Yakın ustalar bildirim aldı</p>
          </div>
        )}
      </div>
    </div>
  )
}
