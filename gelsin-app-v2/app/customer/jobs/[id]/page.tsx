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
  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [existingReview, setExistingReview] = useState<any | null>(null)
  const [rating, setRating] = useState<number>(5)
  const [comment, setComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

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

    // Teklif veren ustalarin profil ID'lerini netlestir (stringe zorla, boslari at)
    const providerIds = Array.from(
      new Set(
        offersList
          .map((o) => (o.provider_id ? String(o.provider_id) : null))
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
        (providerProfiles || []).map((p: any) => [String(p.id), p])
      )
    }

    const enrichedOffers = offersList.map((o) => {
      const providerId = o.provider_id ? String(o.provider_id) : ''
      return {
        ...o,
        profiles: providerId ? profilesById[providerId] || null : null,
        provider_profiles: providerId
          ? providerProfilesById[providerId] || null
          : null,
      }
    })

    setOffers(enrichedOffers)

    // Varsa mevcut değerlendirmeyi çek
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('rating, comment, created_at')
      .eq('job_id', id)
      .limit(1)

    const review = reviewRows && reviewRows.length > 0 ? reviewRows[0] : null
    setExistingReview(review)
    if (review?.rating) setRating(review.rating)
    if (review?.comment) setComment(review.comment)

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hafif polling ile güncel tut (WebSocket yerine, client-side hataları önlemek için)
  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      await load()
    }

    // İlk çağrı üstteki effect tarafından zaten yapılmış durumda;
    // burada sadece periyodik güncelleme sağlıyoruz.
    const interval = setInterval(tick, 7000)

    return () => {
      cancelled = true
      clearInterval(interval)
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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let endToken = ''
    for (let i = 0; i < 6; i++) {
      endToken += chars[Math.floor(Math.random() * chars.length)]
    }
    await supabase.from('jobs').update({ end_qr_token: endToken }).eq('id', id)
    setJob((prev: any) => (prev ? { ...prev, end_qr_token: endToken } : prev))
    setShowEndQR(true)
    setGeneratingEnd(false)
  }

  const submitDispute = async () => {
    if (!disputeReason.trim()) {
      alert('Lütfen kısaca sebebi yazın.')
      return
    }
    setDisputeSubmitting(true)
    const supabase = createClient()

    await supabase.from('jobs').update({ status: 'disputed' }).eq('id', id)

    // Adminleri ve ustayı bilgilendir
    const notifications: any[] = []

    if (job?.provider_id) {
      notifications.push({
        user_id: job.provider_id,
        title: '⚠️ İşte Uyuşmazlık Açıldı',
        body: `"${job.title}" işi için müşteri uyuşmazlık talebi oluşturdu: ${disputeReason}`,
        type: 'job_disputed',
        related_job_id: id,
      })
    }

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    for (const admin of admins || []) {
      notifications.push({
        user_id: admin.id,
        title: '⚠️ Yeni Uyuşmazlık Talebi',
        body: `"${job?.title}" işi için müşteri uyuşmazlık talebi oluşturdu: ${disputeReason}`,
        type: 'job_disputed_admin',
        related_job_id: id,
      })
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    setShowDispute(false)
    setDisputeReason('')
    setDisputeSubmitting(false)
    await load()
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  const startQrData = JSON.stringify({
    job_id: job?.id ?? '',
    token: job?.qr_token ?? '',
    action: 'start',
  })
  const endQrData = JSON.stringify({
    job_id: job?.id ?? '',
    token: job?.end_qr_token ?? '',
    action: 'end',
  })

  const hasStartToken =
    typeof job?.qr_token === 'string' && job.qr_token.length >= 1
  const hasEndToken =
    typeof job?.end_qr_token === 'string' && job.end_qr_token.length >= 1

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: '📢 Teklif Bekleniyor', bg: 'bg-blue-50', color: 'text-blue-700' },
    offered: { label: '💬 Teklif Geldi', bg: 'bg-orange-50', color: 'text-orange-700' },
    accepted: { label: '🚗 Usta Yolda', bg: 'bg-emerald-50', color: 'text-emerald-700' },
    started: { label: '🔨 İş Devam Ediyor', bg: 'bg-orange-50', color: 'text-orange-700' },
    completed: { label: '✅ Tamamlandı', bg: 'bg-gray-50', color: 'text-gray-600' },
    disputed: { label: '⚠️ Uyuşmazlık Açıldı', bg: 'bg-amber-50', color: 'text-amber-700' },
  }

  const rawStatus: string = (job?.status as string) || 'open'
  const hasOffers = offers.length > 0
  const statusKey = hasOffers && rawStatus === 'open' ? 'offered' : rawStatus
  const sc = statusConfig[statusKey] || statusConfig.open

  const showEndSection =
    mounted &&
    job?.status !== 'completed' &&
    job?.status !== 'cancelled' &&
    job?.status !== 'disputed' &&
    (job?.status === 'started' || !!job?.end_qr_token)
  const canOpenDispute = rawStatus === 'accepted' || rawStatus === 'started'

  const stepItems = [
    { key: 'open', label: 'Teklif', icon: '📢' },
    { key: 'offer', label: 'Onay', icon: '✅' },
    { key: 'accepted', label: 'Yolda', icon: '🚗' },
    { key: 'started', label: 'Devam', icon: '🔨' },
    { key: 'completed', label: 'Bitti', icon: '🏁' },
  ] as const

  let activeStep = 0
  if (rawStatus === 'accepted') activeStep = 2
  else if (rawStatus === 'started') activeStep = 3
  else if (rawStatus === 'completed') activeStep = 4

  const submitReview = async () => {
    if (!job?.id || !job?.provider_id) {
      alert('Bu iş için usta bulunamadı.')
      return
    }
    if (!rating || rating < 1 || rating > 5) {
      alert('Lütfen 1-5 arasında bir puan verin.')
      return
    }
    if (existingReview) {
      return
    }
    setReviewSubmitting(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
      setReviewSubmitting(false)
      return
    }

    const { error } = await supabase.from('reviews').insert({
      job_id: job.id,
      customer_id: user.id,
      provider_id: job.provider_id,
      rating,
      comment: comment.trim() || null,
    })

    if (error) {
      console.error('REVIEW INSERT HATASI:', error)
      alert('Değerlendirme kaydedilemedi: ' + error.message)
      setReviewSubmitting(false)
      return
    }

    // Ustanın ortalama puanını güncelle
    const { data: pp } = await supabase
      .from('provider_profiles')
      .select('rating, total_reviews')
      .eq('id', job.provider_id)
      .single()

    const currentRating = Number(pp?.rating || 0)
    const currentCount = Number(pp?.total_reviews || 0)
    const newCount = currentCount + 1
    const newRating = ((currentRating * currentCount) + rating) / newCount

    await supabase
      .from('provider_profiles')
      .update({ rating: newRating, total_reviews: newCount })
      .eq('id', job.provider_id)

    setExistingReview({ rating, comment })
    setReviewSubmitting(false)
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-sky-100 shadow-sm">
        <button onClick={() => router.back()} className="text-blue-600 font-semibold text-sm mb-4 flex items-center gap-1">
          ← Geri
        </button>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
            {job?.service_categories?.icon}
          </div>
          <div className="flex-1">
            <h1 className="font-black text-slate-900 text-lg">{job?.title}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${sc.bg} ${sc.color}`}>
              {sc.label}
            </span>
          </div>
        </div>
      </div>

      {/* Durum Stepper */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl px-3 py-3 border border-sky-100 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-3 min-w-max">
            {stepItems.map((step, index) => {
              const isActive = index <= activeStep
              return (
                <div key={step.label} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isActive
                        ? 'bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${
                      isActive ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < stepItems.length - 1 && (
                    <div className="w-6 h-px bg-gradient-to-r from-slate-200 via-sky-200 to-slate-200" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Başlangıç QR — accepted durumunda */}
        {mounted && job?.status === 'accepted' && (
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
                  {mounted && hasStartToken ? (
                    <QRCodeSVG
                      value={startQrData}
                      size={180}
                      level="H"
                      imageSettings={{
                        src: '',
                        height: 0,
                        width: 0,
                        excavate: false,
                      }}
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-gray-400">
                      Kod hazırlanıyor...
                    </div>
                  )}
                </div>
                {hasStartToken && (
                  <div className="bg-gray-900 text-white px-6 py-2.5 rounded-2xl font-mono text-2xl font-black tracking-[0.3em]">
                    {job?.qr_token?.slice(-6).toUpperCase()}
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center">
                  QR veya PIN'i ustayla paylaşın
                </p>
                {job?.qr_scanned_at && (
                  <div className="badge-green w-full justify-center py-2.5 text-sm">
                    ✅ İş Başladı —{' '}
                    {new Date(job.qr_scanned_at).toLocaleTimeString('tr-TR')}
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

        {/* Bitiş QR — iş devam ederken veya bitiş kodu üretilmişse */}
        {showEndSection && (
          <div className="card p-5 border-2 border-emerald-200 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">🏁</div>
              <div>
                <p className="font-bold text-gray-900">İş Tamamlandı mı?</p>
                <p className="text-xs text-gray-500">Onaylayın, bitiş QR'ı üretin, ustayla taratın</p>
              </div>
            </div>
            {showEndQR && hasEndToken ? (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100">
                  {mounted && hasEndToken ? (
                    <QRCodeSVG
                      value={endQrData}
                      size={180}
                      level="H"
                      imageSettings={{
                        src: '',
                        height: 0,
                        width: 0,
                        excavate: false,
                      }}
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-gray-400">
                      Kod hazırlanıyor...
                    </div>
                  )}
                </div>
                <div className="bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-mono text-2xl font-black tracking-[0.3em]">
                  {job?.end_qr_token?.slice(-6).toUpperCase()}
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Usta okutunca ödeme cüzdanına aktarılır
                </p>
              </div>
            ) : (
              <button className="btn-success" onClick={generateEndQR} disabled={generatingEnd}>
                {generatingEnd ? 'Hazırlanıyor...' : '✅ Onayla & Bitiş QR Üret'}
              </button>
            )}
          </div>
        )}

        {/* Değerlendirme - iş tamamlandıysa */}
        {job?.status === 'completed' && (
          <div className="card p-5 space-y-3 border border-emerald-200 bg-emerald-50/60">
            <p className="text-sm font-bold text-emerald-900">
              İşi nasıl buldunuz? Ustanızı değerlendirin.
            </p>

            {existingReview ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        star <= (existingReview.rating || 0)
                          ? 'text-yellow-400 text-xl'
                          : 'text-gray-300 text-xl'
                      }
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-xs text-emerald-800 font-semibold">
                    {existingReview.rating}/5
                  </span>
                </div>
                {existingReview.comment && (
                  <p className="text-xs text-gray-700 bg-white/80 px-3 py-2 rounded-xl">
                    {existingReview.comment}
                  </p>
                )}
                <p className="text-[11px] text-emerald-700 font-medium">
                  Değerlendirmeniz ustanın profil puanına yansıtıldı.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <span
                        className={
                          star <= rating
                            ? 'text-yellow-400 text-2xl'
                            : 'text-gray-300 text-2xl'
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="text-xs text-emerald-900 font-semibold ml-2">
                    {rating}/5
                  </span>
                </div>
                <textarea
                  className="input text-sm py-2.5 resize-none"
                  rows={3}
                  placeholder="Kısaca yorum bırakmak isterseniz yazabilirsiniz..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={reviewSubmitting}
                />
                <button
                  className="btn-primary py-3 text-sm disabled:opacity-60"
                  onClick={submitReview}
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? 'Kaydediliyor...' : 'Değerlendirmeyi Gönder'}
                </button>
              </div>
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

        {/* Sorun Bildir / Uyuşmazlık Talebi */}
        {canOpenDispute && (
          <div className="card p-4 space-y-2 border border-amber-200 bg-amber-50/60">
            <p className="text-sm font-bold text-amber-800">
              Bir sorun mu var? Usta ile anlaşamadıysanız uyuşmazlık talebi oluşturabilirsiniz.
            </p>
            <button
              className="btn-secondary py-3 text-sm border-amber-300 text-amber-800"
              onClick={() => setShowDispute(true)}
            >
              ⚠️ Sorun Bildir / İptal Talebi
            </button>
          </div>
        )}

        {/* Mesajlaşma */}
        {job?.provider_id && (
          <button
            className="btn-secondary py-3 text-sm"
            onClick={() => router.push(`/chat/${job.id}`)}
          >
            💬 Ustayla Mesajlaş
          </button>
        )}

        {/* Teklifler */}
        {offers.length > 0 && (
          <div>
            <p className="font-bold text-gray-800 mb-3">Teklifler ({offers.length})</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:block lg:space-y-2">
              {offers.map(offer => (
                <div
                  key={offer.id}
                  className={`card p-4 w-72 flex-shrink-0 lg:w-full ${
                  offer.status === 'accepted' ? 'border-2 border-emerald-400' :
                  offer.status === 'rejected' ? 'opacity-50' : ''
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
                        {(offer.profiles?.full_name || offer.profiles?.phone || 'Usta')
                          .charAt(0)
                          .toUpperCase() || '👷'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {offer.profiles?.full_name || offer.profiles?.phone || 'İsimsiz Usta'}
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

      {/* Dispute Modal */}
      {showDispute && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-black text-gray-900 text-sm">
                ⚠️ Sorun Bildir / Uyuşmazlık Talebi
              </p>
              <button
                className="text-gray-400 text-xl leading-none"
                onClick={() => !disputeSubmitting && setShowDispute(false)}
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Kısaca neyin yanlış gittiğini yazın. Bu bilgi admin ekibine ve ustaya iletilecektir.
            </p>
            <textarea
              className="input text-sm py-2.5 resize-none"
              rows={3}
              placeholder="Örn: Usta fiyatta anlaşmadı, iş şartları değişti..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              disabled={disputeSubmitting}
            />
            <button
              className="btn-primary py-3 text-sm disabled:opacity-60"
              onClick={submitDispute}
              disabled={disputeSubmitting}
            >
              {disputeSubmitting ? 'Gönderiliyor...' : 'Uyuşmazlık Talebi Oluştur'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
