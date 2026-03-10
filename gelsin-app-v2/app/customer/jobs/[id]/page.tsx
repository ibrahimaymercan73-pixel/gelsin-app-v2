'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { useChatOverlay } from '@/components/ChatOverlay'
import { isOnline, formatLastSeenRelative } from '@/lib/presence'
import { toast } from 'sonner'

const CATEGORY_LABELS: Record<string, string> = {
  painting: 'Boya',
  plumbing: 'Tesisat',
  carpentry: 'Marangoz',
  electric: 'Elektrik',
  cleaning: 'Temizlik',
  assembly: 'Montaj',
  repair: 'Tamir',
}

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
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [paymentModal, setPaymentModal] = useState<{ token: string; merchantOid: string } | null>(null)

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

    // UUID eşleşmesi için normalize (büyük/küçük harf farkı olmasın)
    const normId = (x: string | null | undefined) =>
      x ? String(x).toLowerCase().trim() : ''

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
        .from('profiles_public')
        .select('id, full_name, avatar_url, face_verified')
        .in('id', providerIds)

      profilesById = Object.fromEntries(
        (profiles || []).map((p: any) => [normId(p.id), { ...p, phone: null, hide_phone: true }])
      )

      const { data: providerProfiles } = await supabase
        .from('provider_profiles')
        .select('id, rating, total_reviews, completed_jobs, service_categories, last_seen, avg_response_time_mins, bio')
        .in('id', providerIds)

      providerProfilesById = Object.fromEntries(
        (providerProfiles || []).map((p: any) => [normId(p.id), p])
      )
    }

    // Kabul edilen uzmanın iletişim bilgisi (RLS: sadece iş tarafı görebilir)
    const { data: counterpartRow } = await supabase.rpc('get_counterpart_contact', { p_job_id: id })
    const counterpart = Array.isArray(counterpartRow) && counterpartRow[0]
      ? (counterpartRow[0] as { phone: string | null; full_name: string | null })
      : null

    const enrichedOffers = offersList.map((o) => {
      const providerId = o.provider_id ? String(o.provider_id) : ''
      const nid = normId(providerId)
      const baseProfiles = nid ? (profilesById[nid] ?? null) : null
      const isAccepted = j && o.provider_id === j.provider_id
      const profiles = isAccepted && counterpart
        ? { full_name: counterpart.full_name, phone: counterpart.phone, hide_phone: !counterpart.phone }
        : baseProfiles
      return {
        ...o,
        profiles,
        provider_profiles: nid ? (providerProfilesById[nid] ?? null) : null,
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

  const { openChat } = useChatOverlay()

  const startPaymentForOffer = async (offer: any) => {
    if (!job?.id) return
    setAccepting(offer.id)
    try {
      const res = await fetch('/api/paytr/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, offer_id: offer.id }),
      })
      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.code === 'already_paid') {
          toast.error('Bu teklif için ödeme zaten alınmış görünüyor.')
        } else {
          toast.error(data?.error || 'Ödeme başlatılamadı. Lütfen tekrar deneyin.')
        }
        return
      }
      if (!data?.token) {
        toast.error('Ödeme servisi beklenmeyen yanıt döndürdü.')
        return
      }
      setPaymentModal({ token: data.token as string, merchantOid: data.merchant_oid as string })
    } catch (e) {
      console.error('[paytr-start]', e)
      toast.error('Ödeme başlatılırken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setAccepting('')
    }
  }

  const requestBargain = async (offer: any) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }

    try {
      const { error: updateErr } = await supabase
        .from('offers')
        .update({ is_bargain_requested: true })
        .eq('id', offer.id)

      if (updateErr) {
        alert('Pazarlık talebi kaydedilemedi: ' + updateErr.message)
        return
      }

      await supabase.from('notifications').insert({
        user_id: offer.provider_id,
        title: '🤝 Pazarlık Talebi',
        body: `"${job?.title ?? ''}" işi için müşteri pazarlık etmek istiyor. Mevcut teklif: ₺${offer.price}.`,
        type: 'offer_negotiate',
        related_job_id: id,
      })
      await load()
      alert('Pazarlık talebin uzmana iletildi.')
    } catch (e) {
      console.error('PAZARLIK TALEBİ HATASI:', e)
      alert('Pazarlık talebi gönderilemedi. Lütfen tekrar dene.')
    }
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

    if (!id) {
      alert('İş bulunamadı.')
      return
    }

    setDisputeSubmitting(true)
    try {
      const res = await fetch('/api/support/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: id,
          reason: disputeReason.trim(),
        }),
      })

      let data: any = null
      try {
        data = await res.json()
      } catch {
        data = null
      }
      console.log('dispute response:', res.status, data)

      if (!res.ok) {
        console.error('[submitDispute] error', data)
        alert((data && data.error) || 'Talep oluşturulurken bir hata oluştu.')
        return
      }

      setShowDispute(false)
      setDisputeReason('')
      await load()
      // Müşteriye toast gösterimi UI tarafında zaten global ise burada sadece console'a yazalım
      console.log('Talebiniz alındı')
    } finally {
      setDisputeSubmitting(false)
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  // QR payload'ı sade tut: sadece iş kimliği ve isteğe bağlı aksiyon bilgisi
  const startQrData = JSON.stringify({
    jobId: job?.id ?? '',
    action: 'start',
  })
  const endQrData = JSON.stringify({
    jobId: job?.id ?? '',
    action: 'end',
  })

  const hasStartToken =
    typeof job?.qr_token === 'string' && job.qr_token.length >= 1
  const hasEndToken =
    typeof job?.end_qr_token === 'string' && job.end_qr_token.length >= 1

  const getOfferPhoneDisplay = (offer: any) => {
    const phone = offer.profiles?.phone as string | undefined | null
    const status = job?.status as string | undefined
    const acceptedProviderId = job?.provider_id as string | undefined
    const isAcceptedOffer =
      (status === 'accepted' || status === 'started' || status === 'completed') &&
      acceptedProviderId &&
      offer.provider_id === acceptedProviderId
    return { phone: phone || null, canShow: !!phone && !!isAcceptedOffer }
  }

  const mediaUrls: string[] = Array.isArray(job?.media_urls)
    ? (job.media_urls as string[])
    : []

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: '📢 Teklif Bekleniyor', bg: 'bg-blue-50', color: 'text-blue-700' },
    offered: { label: '💬 Teklif Geldi', bg: 'bg-orange-50', color: 'text-orange-700' },
    accepted: { label: '🚗 Uzman Yolda', bg: 'bg-emerald-50', color: 'text-emerald-700' },
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

  const commissionRate = 0.02
  const commissionAmount =
    typeof job?.agreed_price === 'number'
      ? job.agreed_price * commissionRate
      : null
  const providerNetAmount =
    typeof job?.agreed_price === 'number' && commissionAmount !== null
      ? job.agreed_price - commissionAmount
      : null

  const submitReview = async () => {
    if (!job?.id || !job?.provider_id) {
      alert('Bu iş için uzman bulunamadı.')
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

    // Uzmanın ortalama puanını güncelle
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
    <div className="min-h-dvh bg-gray-50 w-full flex flex-col flex-1 overflow-x-hidden overflow-y-auto pb-28">
      <div className="bg-white px-3 pt-6 pb-2 border-b border-sky-100 shadow-sm shrink-0">
        <button onClick={() => router.back()} className="text-blue-600 font-medium text-xs mb-2 flex items-center gap-1">
          ← Geri
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
            {job?.service_categories?.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 text-sm truncate">{job?.title}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${sc.bg} ${sc.color}`}>
              {sc.label}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto">
        {/* Durum Stepper — kompakt */}
        <div className="px-3 pt-2">
          <div className="bg-white rounded-xl px-2 py-1.5 border border-sky-100 shadow-sm">
            <div className="flex items-center gap-1 md:gap-4 w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
              {stepItems.map((step, index) => {
                const isActive = index <= activeStep
                return (
                  <div key={step.label} className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <div
                      className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <span className={`text-[10px] md:text-xs font-medium ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                    {index < stepItems.length - 1 && (
                      <div className="w-2 md:w-4 h-px bg-slate-200 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-3 py-2 space-y-2">
        {/* Başlangıç QR — accepted durumunda */}
        {mounted && job?.status === 'accepted' && (
          <div className="card p-5 border-2 border-blue-200 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📱</div>
              <div>
                <p className="font-bold text-gray-900">Başlangıç QR Kodu</p>
                <p className="text-xs text-gray-500">Uzman gelince gösterin — kodu okutmadan iş başlamaz</p>
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
                  QR veya PIN'i uzmanla paylaşın
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
                <p className="text-xs text-gray-500">
                  Onaylayın, ustanın ödemesi başlatılsın (IBAN transferi).
                </p>
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
                  Uzman okutunca ödeme cüzdanına aktarılır ve IBAN\'ınıza transfer süreci başlar.
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
          <div className="card p-4 space-y-2.5 border border-emerald-200 bg-emerald-50/60">
            <p className="text-xs font-bold text-emerald-900">
              İşi nasıl buldunuz? Uzmanınızı değerlendirin.
            </p>

            {existingReview ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        star <= (existingReview.rating || 0)
                          ? 'text-yellow-400 text-lg'
                          : 'text-gray-300 text-lg'
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
                  Değerlendirmeniz uzmanın profil puanına yansıtıldı.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
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
                            ? 'text-yellow-400 text-xl'
                            : 'text-gray-300 text-xl'
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
                  className="btn-primary py-2.5 text-sm disabled:opacity-60"
                  onClick={submitReview}
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? 'Kaydediliyor...' : 'Değerlendirmeyi Gönder'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* İş detayları + konum — tek kompakt kart */}
        <div className="card p-2.5 space-y-2">
          {job?.description && (
            <p className="text-gray-600 text-xs leading-snug line-clamp-3">{job.description}</p>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-xs">📍</span>
            <p className="text-gray-700 text-xs flex-1 truncate">{job?.address}</p>
          </div>
          {job?.agreed_price && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between bg-blue-50 px-2.5 py-2 rounded-lg">
                <span className="text-gray-600 text-xs font-medium">
                  Anlaşılan Fiyat
                </span>
                <span className="text-blue-700 font-bold text-base">
                  ₺{job.agreed_price}
                </span>
              </div>
              {providerNetAmount !== null && (
                <p className="text-[11px] text-slate-400 text-right">
                  Platform hizmet bedeli: %2 &nbsp;•&nbsp; Uzmana geçecek net
                  tutar ≈{' '}
                  <span className="font-semibold text-slate-600">
                    ₺{providerNetAmount.toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          )}
          {mediaUrls.length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-xs font-bold text-gray-800">Ekler / Görseller</p>
              <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
                {mediaUrls.map((url) => {
                  const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox({ url, type: isVideo ? 'video' : 'image' })}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-black/5 flex-shrink-0"
                    >
                      {isVideo ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={url}
                          alt="Ek görsel"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sorun Bildir */}
        {canOpenDispute && (
          <div className="rounded-xl p-2.5 border border-amber-200 bg-amber-50/60">
            <p className="text-[11px] font-semibold text-amber-800 mb-1.5">
              Sorun mu var? Uyuşmazlık talebi oluşturabilirsiniz.
            </p>
            <button
              className="btn-secondary py-2 text-xs w-full border-amber-300 text-amber-800"
              onClick={() => setShowDispute(true)}
            >
              ⚠️ Sorun Bildir
            </button>
          </div>
        )}

        {/* Mesajlaşma */}
        {job?.provider_id && (
          <button
            className="btn-secondary py-2 text-xs w-full"
            onClick={() => openChat(job.id)}
          >
            💬 Uzmanla Mesajlaş
          </button>
        )}

        {/* Teklifler */}
        {offers.length > 0 && (
          <div>
            <p className="font-bold text-gray-800 text-xs mb-2">Teklifler ({offers.length})</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:block lg:space-y-2">
              {offers.map(offer => (
                <div
                  key={offer.id}
                  className={`card p-4 w-full sm:w-72 flex-shrink-0 lg:w-full ${
                  offer.status === 'accepted' ? 'border-2 border-emerald-400' :
                  offer.status === 'rejected' ? 'opacity-50' : ''
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {offer.profiles?.avatar_url ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                          <Image
                            src={offer.profiles.avatar_url}
                            alt=""
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center text-lg font-bold text-gray-600 flex-shrink-0">
                          {(offer.profiles?.full_name || offer.profiles?.phone || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-gray-900 truncate">
                            {offer.profiles?.full_name || offer.profiles?.phone || 'İsimsiz Uzman'}
                          </p>
                          {offer.profiles?.face_verified && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex-shrink-0" title="Kimlik doğrulandı">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap mt-0.5">
                          <span className="text-yellow-500">★</span>
                          <span>{offer.provider_profiles?.rating ?? '—'}</span>
                          <span className="text-gray-400">·</span>
                          <span>{offer.provider_profiles?.total_reviews ?? 0} değerlendirme</span>
                          {(offer.provider_profiles?.completed_jobs != null && offer.provider_profiles.completed_jobs > 0) && (
                            <>
                              <span className="text-gray-400">·</span>
                              <span>{offer.provider_profiles.completed_jobs} tamamlanan iş</span>
                            </>
                          )}
                        </div>
                        {Array.isArray(offer.provider_profiles?.service_categories) &&
                          offer.provider_profiles.service_categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {offer.provider_profiles.service_categories.slice(0, 4).map((c: string) => (
                              <span
                                key={c}
                                className="px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-semibold text-blue-700"
                              >
                                {CATEGORY_LABELS[c] || c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-black text-blue-700">₺{offer.price}</p>
                      {offer.estimated_duration && (
                        <p className="text-xs text-gray-400">⏱ {offer.estimated_duration}</p>
                      )}
                    </div>
                  </div>
                  {offer.provider_profiles?.bio && (
                    <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl mb-2 line-clamp-2">
                      {offer.provider_profiles.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Link
                      href={`/customer/provider/${offer.provider_id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Profili Gör →
                    </Link>
                    {(() => {
                      const { phone, canShow } = getOfferPhoneDisplay(offer)
                      if (!phone || !canShow) return null
                      return (
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-0.5 text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md px-1.5 py-0.5 text-xs font-medium"
                        >
                          📞 Beni Ara
                        </a>
                      )
                    })()}
                  </div>
                  {typeof offer.provider_profiles?.avg_response_time_mins === 'number' && (
                    <p className="text-[11px] text-slate-500 mb-2">
                      ⚡ Genellikle {offer.provider_profiles.avg_response_time_mins} dk içinde yanıt verir
                    </p>
                  )}
                  {offer.provider_profiles?.last_seen && (
                    <p className="text-[11px] text-slate-500 mb-2">
                      {isOnline(offer.provider_profiles.last_seen) ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Çevrimiçi
                        </span>
                      ) : (
                        <span>🕒 {formatLastSeenRelative(offer.provider_profiles.last_seen)}</span>
                      )}
                    </p>
                  )}
                  {offer.message && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl mb-3">{offer.message}</p>
                  )}
                  {offer.status === 'pending' && job?.status !== 'accepted' && job?.status !== 'started' && (
                    <div className="flex flex-col gap-2">
                      <button
                        className="btn-primary py-3 text-sm"
                        onClick={() => startPaymentForOffer(offer)}
                        disabled={!!accepting}
                      >
                        {accepting === offer.id ? 'İşleniyor...' : '✅ Bu Teklifi Kabul Et'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary py-2.5 text-xs"
                        onClick={() => requestBargain(offer)}
                      >
                        🤝 Pazarlık Et
                      </button>
                    </div>
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
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
            <span className="text-xl flex-shrink-0">⏳</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-700 text-xs">Teklif bekleniyor...</p>
              <p className="text-[10px] text-gray-500">Yakın uzmanlar bildirim aldı</p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Spacer: alt menü + FAB altında kalmaması için yeterli fiziksel boşluk */}
      <div className="h-44 md:h-16 w-full shrink-0 pointer-events-none" aria-hidden />

      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <p className="font-semibold text-slate-900 text-sm">Güvenli Ödeme – PayTR</p>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`https://www.paytr.com/odeme/guvenli/${paymentModal.token}`}
                className="w-full h-[600px] border-0"
                allow="payment"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDispute && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up space-y-4">
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
              Kısaca neyin yanlış gittiğini yazın. Bu bilgi admin ekibine ve uzmana iletilecektir.
            </p>
            <textarea
              className="input text-sm py-2.5 resize-none"
              rows={3}
              placeholder="Örn: Uzman fiyatta anlaşmadı, iş şartları değişti..."
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
