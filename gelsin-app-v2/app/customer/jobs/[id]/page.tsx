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
import {
  Check,
  ChevronLeft,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Star,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react'

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
  const [milestones, setMilestones] = useState<any[]>([])
  const [milestonePaying, setMilestonePaying] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()

    const { data: j } = await supabase
      .from('jobs')
      .select('*, service_categories(name, icon)')
      .eq('id', id)
      .single()

    let jobRow = j

    const { data: offerRows } = await supabase
      .from('offers')
      .select('id, job_id, provider_id, price, estimated_duration, message, status, is_milestone, milestone_data')
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

    if (jobRow && !(jobRow as { is_pro?: boolean }).is_pro) {
      const acc = offersList.find((o: any) => o.status === 'accepted' && o.is_milestone === true)
      if (acc) {
        await supabase.from('jobs').update({ is_pro: true }).eq('id', id)
        jobRow = { ...jobRow, is_pro: true }
      }
    }

    const { data: milestones } = await supabase
      .from('milestones')
      .select('*')
      .eq('job_id', id)
      .order('order_index', { ascending: true })
    setMilestones(milestones || [])

    const enrichedOffers = offersList.map((o) => {
      const providerId = o.provider_id ? String(o.provider_id) : ''
      const nid = normId(providerId)
      const baseProfiles = nid ? (profilesById[nid] ?? null) : null
      const isAccepted = jobRow && o.provider_id === jobRow.provider_id
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
    setJob(jobRow)

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

  const approveMilestonePayment = async (milestoneId: string) => {
    setMilestonePaying(milestoneId)
    try {
      const res = await fetch('/api/milestones/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_id: milestoneId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error || 'Ödeme onaylanamadı')
        return
      }
      toast.success('Aşama ödemesi ustaya aktarıldı.')
      await load()
    } catch (e) {
      console.error(e)
      toast.error('Bir hata oluştu')
    } finally {
      setMilestonePaying(null)
    }
  }

  const handleAcceptOffer = async (offerId: string) => {
    if (!job?.id) return
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .single()

      if (offerError) throw offerError

      console.log('Offer:', offer)
      console.log('is_milestone:', (offer as { is_milestone?: boolean }).is_milestone)

      const jobId = job.id

      if ((offer as { is_milestone?: boolean }).is_milestone) {
        const { data: milestones } = await supabase
          .from('milestones')
          .select('*')
          .eq('job_id', jobId)
          .order('order_index', { ascending: true })

        console.log('Milestones:', milestones)

        const firstMilestone = milestones?.[0]

        if (!firstMilestone) {
          alert('Aşama bilgisi bulunamadı!')
          return
        }

        console.log('İlk aşama tutarı:', firstMilestone.amount)

        const res = await fetch('/api/paytr/create-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: jobId,
            offer_id: offerId,
            amount: firstMilestone.amount,
            milestone_id: firstMilestone.id,
          }),
        })

        if (!res.ok) {
          const err = await res.text()
          console.error('PayTR hatası:', err)
          alert('Ödeme başlatılamadı: ' + err)
          return
        }

        const data = await res.json().catch(() => ({}))
        console.log('PayTR token:', data.token)
        if (!data?.token) {
          toast.error('Ödeme servisi beklenmeyen yanıt döndürdü.')
          return
        }
        setPaymentModal({
          token: data.token as string,
          merchantOid: data.merchant_oid as string,
        })
      } else {
        const res = await fetch('/api/paytr/create-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: job.id, offer_id: offerId }),
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
      }
    } catch (err) {
      console.error('Hata:', err)
      alert('Bir hata oluştu: ' + err)
    } finally {
      setLoading(false)
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
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
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
    { key: 'open', label: 'Teklif' },
    { key: 'offer', label: 'Onay' },
    { key: 'accepted', label: 'Yolda' },
    { key: 'started', label: 'Devam' },
    { key: 'completed', label: 'Bitti' },
  ] as const

  let activeStep = 0
  if (rawStatus === 'completed') activeStep = 4
  else if (rawStatus === 'started') activeStep = 3
  else if (rawStatus === 'accepted') activeStep = 2
  else if (hasOffers && rawStatus === 'open') activeStep = 1
  else activeStep = 0

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
    <div className="min-h-dvh bg-gradient-to-b from-slate-100/80 via-white to-slate-50/90 w-full flex flex-col flex-1 overflow-x-hidden overflow-y-auto pb-28 font-sans antialiased">
      <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl px-4 pt-4 pb-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-800 text-xs font-medium mb-3 inline-flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Geri
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg ring-1 ring-slate-200/80">
            {job?.service_categories?.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2">{job?.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${sc.bg} ${sc.color}`}
              >
                {sc.label}
              </span>
              {job?.is_pro && (
                <span className="inline-flex items-center rounded-full border border-amber-400/60 bg-gradient-to-r from-amber-100 to-amber-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-900">
                  Gelsin Pro İş
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="w-full max-w-lg mx-auto">
        {/* Stepper — ince, yeşil tamamlanan, aktif pulse */}
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-3 py-3 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-0.5 overflow-x-auto scrollbar-hide pb-0.5">
              {stepItems.map((step, index) => {
                const done = index < activeStep
                const current = index === activeStep
                return (
                  <div key={step.label} className="flex flex-1 min-w-0 items-center">
                    <div className="flex flex-col items-center gap-1 min-w-[3.25rem] flex-1">
                      <div className="relative flex h-7 w-7 items-center justify-center">
                        {current && (
                          <span
                            className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping"
                            aria-hidden
                          />
                        )}
                        <div
                          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                            done
                              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                              : current
                                ? 'bg-white text-emerald-600 ring-2 ring-emerald-500 shadow-md shadow-emerald-500/15'
                                : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-medium tracking-tight text-center leading-tight max-w-[4.5rem] ${
                          done || current ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < stepItems.length - 1 && (
                      <div
                        className={`h-px flex-1 min-w-[6px] mx-0.5 mb-5 rounded-full ${
                          index < activeStep ? 'bg-emerald-300' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
        {/* Başlangıç QR — kabul sonrası ana odağı */}
        {mounted && job?.status === 'accepted' && (
          <section className="rounded-2xl border border-slate-200/60 bg-white p-6 sm:p-7 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.15)] animate-scale-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
                <QrCode className="h-6 w-6" strokeWidth={2} aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">Başlangıç QR kodu</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Uzman adresine geldiğinde gösterin; okutulmadan iş resmen başlamaz.
                </p>
              </div>
            </div>
            {job?.qr_scanned_at ? (
              <div className="rounded-2xl bg-emerald-50/90 border border-emerald-100/80 px-4 py-3.5 text-center">
                <p className="text-sm font-semibold text-emerald-900">İş başladı</p>
                <p className="text-xs text-emerald-700/90 mt-0.5">
                  {new Date(job.qr_scanned_at).toLocaleString('tr-TR')}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowStartQR(true)}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-slate-900 py-4 text-[15px] font-semibold text-white shadow-xl shadow-slate-900/20 transition-transform hover:bg-slate-800 active:scale-[0.99]"
              >
                <QrCode className="h-5 w-5 shrink-0" strokeWidth={2} />
                QR kodunu göster
              </button>
            )}
          </section>
        )}

        {/* Bitiş QR */}
        {showEndSection && (
          <section className="rounded-2xl border border-emerald-200/50 bg-emerald-50/40 p-6 sm:p-7 shadow-[0_8px_28px_-14px_rgba(16,185,129,0.2)] animate-scale-in">
            <h2 className="text-base font-semibold text-slate-900">İş tamamlandı mı?</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Onaylayınca bitiş kodu oluşur; uzman okutunca ödeme süreci başlar.
            </p>
            {showEndQR && hasEndToken ? (
              <div className="mt-5 flex flex-col items-center gap-4">
                <div className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.1)]">
                  {mounted && hasEndToken ? (
                    <QRCodeSVG
                      value={endQrData}
                      size={200}
                      level="H"
                      imageSettings={{ src: '', height: 0, width: 0, excavate: false }}
                    />
                  ) : (
                    <div className="flex h-[200px] w-[200px] items-center justify-center text-xs text-slate-400">
                      Kod hazırlanıyor...
                    </div>
                  )}
                </div>
                <div className="rounded-2xl bg-emerald-700 px-8 py-3 font-mono text-2xl font-bold tracking-[0.35em] text-white shadow-lg shadow-emerald-700/25">
                  {job?.end_qr_token?.slice(-6).toUpperCase()}
                </div>
                <p className="max-w-xs text-center text-[11px] leading-relaxed text-slate-500">
                  Uzman bu kodu okutunca ödeme aktarımı tetiklenir.
                </p>
              </div>
            ) : (
              <button
                type="button"
                className="mt-5 w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-emerald-500 disabled:opacity-60"
                onClick={generateEndQR}
                disabled={generatingEnd}
              >
                {generatingEnd ? 'Hazırlanıyor…' : 'Onayla ve bitiş QR üret'}
              </button>
            )}
          </section>
        )}

        {/* Değerlendirme - iş tamamlandıysa */}
        {job?.status === 'completed' && (
          <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/50 p-5 sm:p-6 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-emerald-900">
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

        {/* İş detayları + fiyat — yumuşak bloklar, çizgisiz */}
        <section className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 shadow-sm space-y-5">
          {job?.agreed_price != null && Number(job.agreed_price) > 0 && (
            <div className="rounded-2xl bg-slate-50/90 px-5 py-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Anlaşılan tutar</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
                ₺{Number(job.agreed_price).toLocaleString('tr-TR')}
              </p>
              {providerNetAmount !== null && (
                <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                  <p className="flex justify-between gap-4">
                    <span>Platform hizmet bedeli</span>
                    <span className="tabular-nums text-slate-500">%2</span>
                  </p>
                  <p className="flex justify-between gap-4 border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500">Uzmana yaklaşık net</span>
                    <span className="font-medium tabular-nums text-slate-600">
                      ₺{providerNetAmount.toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
          {job?.description && (
            <p className="text-sm leading-relaxed text-slate-600 line-clamp-4">{job.description}</p>
          )}
          <div className="flex items-start gap-2.5 text-sm text-slate-700">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" strokeWidth={2} aria-hidden />
            <span className="leading-snug">{job?.address}</span>
          </div>
          {mediaUrls.length > 0 && (
            <div className="rounded-2xl bg-slate-50/60 p-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">Ekler</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {mediaUrls.map((url) => {
                  const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox({ url, type: isVideo ? 'video' : 'image' })}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
                    >
                      {isVideo ? (
                        <video src={url} className="h-full w-full object-cover" muted playsInline />
                      ) : (
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {job?.status !== 'open' && milestones && milestones.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-gray-900 mb-3">
              🏗️ Gelsin Pro — İş Aşamaları
            </h3>
            {milestones.map((m: any) => (
              <div key={m.id} className="border rounded-2xl p-4 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-900">{m.title}</span>
                  <span className="text-sm font-bold text-blue-600">
                    ₺{Number(m.amount).toLocaleString('tr-TR')} · %{m.percentage}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{m.description}</p>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      m.status === 'pending'
                        ? 'bg-gray-100 text-gray-500'
                        : m.status === 'photos_uploaded'
                          ? 'bg-blue-100 text-blue-600'
                          : m.status === 'ai_approved'
                            ? 'bg-green-100 text-green-600'
                            : m.status === 'customer_approved'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {m.status === 'pending'
                      ? '⏳ Bekliyor'
                      : m.status === 'photos_uploaded'
                        ? '📸 Fotoğraf Yüklendi'
                        : m.status === 'ai_approved'
                          ? '✅ AI Onayladı'
                          : m.status === 'customer_approved'
                            ? '💰 Ödendi'
                            : m.status}
                  </span>
                  {m.status === 'ai_approved' && (
                    <button
                      type="button"
                      disabled={milestonePaying === m.id}
                      onClick={() => void approveMilestonePayment(m.id)}
                      className="bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                    >
                      {milestonePaying === m.id
                        ? 'İşleniyor…'
                        : `Onayla & Öde ₺${Number(m.amount).toLocaleString('tr-TR')}`}
                    </button>
                  )}
                </div>
                {m.ai_report && (
                  <div className="mt-3 bg-green-50 rounded-xl p-3">
                    <p className="text-xs text-green-700 font-semibold">
                      🤖 AI Raporu: {m.ai_report}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Teklifler / uzman kartı */}
        {offers.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Teklifler · {offers.length}
            </p>
            <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 lg:mx-0 lg:block lg:space-y-4">
              {offers.map((offer) => {
                const isAccepted = offer.status === 'accepted'
                const r = Number(offer.provider_profiles?.rating)
                const hasRating = Number.isFinite(r) && r > 0
                const reviews = offer.provider_profiles?.total_reviews ?? 0
                return (
                  <div
                    key={offer.id}
                    className={`w-full min-w-[280px] shrink-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-opacity lg:min-w-0 ${
                      isAccepted
                        ? 'border-emerald-200/80 shadow-[0_8px_30px_-12px_rgba(16,185,129,0.18)]'
                        : 'border-slate-200/70'
                    } ${offer.status === 'rejected' ? 'opacity-45' : ''}`}
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        {offer.profiles?.avatar_url ? (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-md ring-offset-2 ring-offset-slate-50">
                            <Image
                              src={offer.profiles.avatar_url}
                              alt=""
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-lg font-semibold text-slate-600">
                            {(offer.profiles?.full_name || offer.profiles?.phone || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900 text-[15px] leading-tight truncate">
                              {offer.profiles?.full_name || offer.profiles?.phone || 'Uzman'}
                            </p>
                            {offer.profiles?.face_verified && (
                              <ShieldCheck
                                className="h-4 w-4 shrink-0 text-emerald-600"
                                strokeWidth={2}
                                aria-label="Doğrulanmış"
                              />
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {hasRating ? (
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3.5 w-3.5 ${
                                      star <= Math.round(r)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'fill-slate-100 text-slate-200'
                                    }`}
                                    strokeWidth={star <= Math.round(r) ? 0 : 1.5}
                                  />
                                ))}
                              </div>
                            ) : null}
                            {hasRating && (
                              <span className="text-xs font-medium tabular-nums text-slate-600">
                                {r.toFixed(1)}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {reviews} değerlendirme
                            </span>
                          </div>
                          {isAccepted && job?.id && job?.provider_id === offer.provider_id && (
                            <button
                              type="button"
                              onClick={() => openChat(job.id)}
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto sm:px-4"
                            >
                              <MessageCircle className="h-4 w-4 text-slate-500" strokeWidth={2} />
                              Uzmanla yazış
                            </button>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                            ₺{Number(offer.price).toLocaleString('tr-TR')}
                          </p>
                          {offer.estimated_duration && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{offer.estimated_duration}</p>
                          )}
                        </div>
                      </div>

                      {Array.isArray(offer.provider_profiles?.service_categories) &&
                        offer.provider_profiles.service_categories.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {offer.provider_profiles.service_categories.slice(0, 5).map((c: string) => (
                              <span
                                key={c}
                                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                {CATEGORY_LABELS[c] || c}
                              </span>
                            ))}
                          </div>
                        )}

                      {offer.provider_profiles?.bio && (
                        <p className="mt-4 text-sm leading-relaxed text-slate-600 line-clamp-3 rounded-xl bg-slate-50/80 px-3 py-2.5">
                          {offer.provider_profiles.bio}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                        <Link
                          href={`/customer/provider/${offer.provider_id}`}
                          className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                        >
                          Profili aç
                        </Link>
                        {(() => {
                          const { phone, canShow } = getOfferPhoneDisplay(offer)
                          if (!phone || !canShow) return null
                          return (
                            <a
                              href={`tel:${phone}`}
                              className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
                                <Phone className="h-3.5 w-3.5" strokeWidth={2} />
                              </span>
                              Ara
                            </a>
                          )
                        })()}
                      </div>

                      {typeof offer.provider_profiles?.avg_response_time_mins === 'number' && (
                        <p className="mt-3 text-[11px] text-slate-400">
                          Ort. yanıt ~{offer.provider_profiles.avg_response_time_mins} dk
                        </p>
                      )}
                      {offer.provider_profiles?.last_seen && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {isOnline(offer.provider_profiles.last_seen) ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Çevrimiçi
                            </span>
                          ) : (
                            formatLastSeenRelative(offer.provider_profiles.last_seen)
                          )}
                        </p>
                      )}
                      {offer.message && (
                        <p className="mt-3 text-xs leading-relaxed text-slate-500 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                          {offer.message}
                        </p>
                      )}
                      {offer.status === 'pending' &&
                        job?.status !== 'accepted' &&
                        job?.status !== 'started' && (
                          <div className="mt-5 flex flex-col gap-2.5">
                            <button
                              type="button"
                              className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition-colors hover:bg-slate-800 disabled:opacity-50"
                              onClick={() => void handleAcceptOffer(offer.id)}
                              disabled={loading}
                            >
                              {loading ? 'İşleniyor…' : 'Bu teklifi kabul et'}
                            </button>
                            <button
                              type="button"
                              className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              onClick={() => requestBargain(offer)}
                            >
                              Pazarlık iste
                            </button>
                          </div>
                        )}
                    </div>
                    {isAccepted && (
                      <div className="border-t border-emerald-100/80 bg-emerald-50/70 px-5 py-2.5 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                          Kabul edildi
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {offers.length === 0 && job?.status === 'open' && (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3.5">
            <p className="font-medium text-slate-800 text-sm">Teklif bekleniyor</p>
            <p className="text-xs text-slate-500 mt-0.5">Yakındaki uzmanlar bildirim aldı.</p>
          </div>
        )}

        {canOpenDispute && (
          <div className="pt-2 pb-1 text-center">
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-orange-800/80 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
              Sorun mu var? Bildir
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Spacer: alt menü + FAB altında kalmaması için yeterli fiziksel boşluk */}
      <div className="h-44 md:h-16 w-full shrink-0 pointer-events-none" aria-hidden />

      {/* Başlangıç QR — tam ekran modal */}
      {showStartQR && mounted && job?.status === 'accepted' && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-5 backdrop-blur-md"
          onClick={() => setShowStartQR(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-qr-title"
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setShowStartQR(false)}
              aria-label="Kapat"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <h3 id="start-qr-title" className="pr-10 text-center text-lg font-semibold tracking-tight text-slate-900">
              Başlangıç QR
            </h3>
            <p className="mt-1 text-center text-xs text-slate-500">Uzmana gösterin</p>
            <div className="mt-6 flex justify-center rounded-2xl bg-white p-5 shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
              {hasStartToken ? (
                <QRCodeSVG
                  value={startQrData}
                  size={220}
                  level="H"
                  imageSettings={{ src: '', height: 0, width: 0, excavate: false }}
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-sm text-slate-400">
                  Yükleniyor…
                </div>
              )}
            </div>
            {hasStartToken && (
              <>
                <div className="mt-5 rounded-2xl bg-slate-900 py-3.5 text-center font-mono text-2xl font-bold tracking-[0.35em] text-white shadow-lg">
                  {job?.qr_token?.slice(-6).toUpperCase()}
                </div>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
                  İsterseniz bu PIN’i sözlü olarak da paylaşabilirsiniz.
                </p>
              </>
            )}
          </div>
        </div>
      )}

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
