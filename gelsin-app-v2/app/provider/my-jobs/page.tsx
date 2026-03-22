'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  QrCode,
  MessageCircle,
  Navigation,
  MapPin,
  User,
  Phone,
  Lock,
  AlertTriangle,
  Package,
  Hammer,
  CheckCircle2,
} from 'lucide-react'
import { useChatOverlay } from '@/components/ChatOverlay'

const QrScanner = dynamic(() => import('@/components/QrScanner'), { ssr: false })

export default function ProviderMyJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [scanModal, setScanModal] = useState<{ jobId: string; action: 'start' | 'end' } | null>(null)
  const [pinModal, setPinModal] = useState<{ jobId: string; action: 'start' | 'end' } | null>(null)
  const [pin, setPin] = useState('')
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [disputeModal, setDisputeModal] = useState<{ jobId: string } | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const { openChat } = useChatOverlay()

  const load = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setJobs([])
      return
    }

    // 1) Doğrudan provider_id üzerinden bu uzmana atanmış işleri çek
    const { data: jobsByProvider } = await supabase
      .from('jobs')
      .select(
        'id, title, status, agreed_price, address, lat, lng, customer_id, qr_scanned_at, payment_released, qr_used_at, created_at, service_categories(name, icon)'
      )
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })

    // 2) Ek olarak, bu uzmanın herhangi bir teklif verdiği işler üzerinden ID listesi çıkar
    const { data: acceptedOffers } = await supabase
      .from('offers')
      .select('job_id')
      .eq('provider_id', user.id)

    const jobIds = Array.from(
      new Set(
        (acceptedOffers || [])
          .map((o: any) => o.job_id as string | null)
          .filter((id): id is string => !!id)
      )
    )

    let jobsCombined = jobsByProvider || []

    if (jobIds.length > 0) {
      const { data: jobsByOffers } = await supabase
        .from('jobs')
        .select(
          'id, title, status, agreed_price, address, lat, lng, customer_id, qr_scanned_at, payment_released, qr_used_at, created_at, service_categories(name, icon)'
        )
        .in('id', jobIds)

      if (jobsByOffers && jobsByOffers.length > 0) {
        const map = new Map<string, any>()
        for (const j of jobsCombined) map.set(j.id, j)
        for (const j of jobsByOffers) map.set(j.id, j)
        jobsCombined = Array.from(map.values())
      }
    }

    // Karşı taraf (müşteri) bilgisi: RLS uyumlu RPC
    const idsForRpc = jobsCombined.map((j: any) => j.id)
    let counterpartsByJobId: Record<string, { phone: string | null; full_name: string | null }> = {}
    if (idsForRpc.length > 0) {
      const { data: rows } = await supabase.rpc('get_job_counterparts', { p_job_ids: idsForRpc })
      if (rows) {
        for (const r of rows as { job_id: string; phone: string | null; full_name: string | null }[]) {
          counterpartsByJobId[r.job_id] = { phone: r.phone, full_name: r.full_name }
        }
      }
    }

    jobsCombined = jobsCombined.map((j: any) => ({
      ...j,
      profiles: counterpartsByJobId[j.id]
        ? { full_name: counterpartsByJobId[j.id].full_name, phone: counterpartsByJobId[j.id].phone, hide_phone: !counterpartsByJobId[j.id].phone }
        : null,
    }))

    // Tarihe göre yeniden sırala (en yeni üstte)
    jobsCombined.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setJobs(jobsCombined)
  }

  useEffect(() => { load() }, [])

  const processToken = async (jobId: string, action: 'start' | 'end', token: string) => {
    const supabase = createClient()
    const { data: job } = await supabase
      .from('jobs')
      .select('qr_token, end_qr_token')
      .eq('id', jobId)
      .single()

    const expected = action === 'start' ? job?.qr_token : job?.end_qr_token
    if (!expected || token.toUpperCase() !== expected.slice(-6).toUpperCase()) {
      setResult({ ok: false, msg: 'Kod hatalı veya eşleşmiyor!' })
      return false
    }
    return true
  }

  const handleQRScan = async (jobId: string, action: 'start' | 'end', raw: string) => {
    setScanModal(null)
    try {
      const text = (raw || '').trim()
      if (!text) {
        setResult({ ok: false, msg: 'QR kod okunamadı.' })
        return
      }

      let scannedJobId: string | null = null
      let scannedAction: 'start' | 'end' | null = null

      if (text.startsWith('{')) {
        try {
          const parsed = JSON.parse(text)
          scannedJobId = (parsed.jobId || parsed.job_id || '') as string
          scannedAction = (parsed.action as 'start' | 'end' | undefined) || null
        } catch (err) {
          console.error('QR JSON parse hatası:', err)
        }
      }

      if (!scannedJobId) {
        scannedJobId = text
      }

      if (!scannedJobId) {
        setResult({ ok: false, msg: 'QR kodu geçersiz.' })
        return
      }

      if (scannedJobId !== jobId) {
        setResult({ ok: false, msg: 'QR farklı bir işe ait.' })
        return
      }

      if (scannedAction && scannedAction !== action) {
        setResult({ ok: false, msg: 'Bu QR bu işlem için geçerli değil.' })
        return
      }

      await completeAction(jobId, action)
    } catch (err) {
      console.error('QR işleme hatası:', err)
      setResult({ ok: false, msg: 'QR kod okunamadı.' })
    }
  }

  const handlePINSubmit = async () => {
    if (!pinModal) return
    const valid = await processToken(pinModal.jobId, pinModal.action, pin)
    if (valid) await completeAction(pinModal.jobId, pinModal.action)
    setPinModal(null)
    setPin('')
  }

  const completeAction = async (jobId: string, action: 'start' | 'end') => {
    const job = jobs.find(j => j.id === jobId)
    if (action === 'start') {
      if (job?.qr_scanned_at) {
        setResult({ ok: false, msg: 'Bu QR kodu zaten kullanıldı.' })
        return
      }
      const res = await fetch('/api/qr/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })
      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResult({ ok: false, msg: data?.error || 'İş başlatılamadı.' })
        return
      }
      setResult({ ok: true, msg: '✅ İş başlatıldı! Göreve devam edin.' })
    } else {
      if (job?.payment_released || job?.qr_used_at) {
        setResult({ ok: false, msg: 'Bu QR kodu zaten kullanıldı, ödeme yapıldı.' })
        return
      }
      const res = await fetch('/api/qr/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, action: 'end' }),
      })
      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResult({ ok: false, msg: data?.error || 'İş tamamlanamadı.' })
        return
      }
      setResult({ ok: true, msg: '🎉 İş tamamlandı! Ödeme transferi başlatıldı.' })
    }
    await load()
  }

  const submitDispute = async () => {
    if (!disputeModal) return
    if (!disputeReason.trim()) {
      alert('Lütfen kısaca sebebi yazın.')
      return
    }
    setDisputeSubmitting(true)
    const supabase = createClient()
    const job = jobs.find(j => j.id === disputeModal.jobId)

    await supabase.from('jobs').update({ status: 'disputed' }).eq('id', disputeModal.jobId)

    // Anlaşmazlığı support_tickets tablosuna da kaydet (admin anlaşmazlık ekranı için)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && job) {
      await supabase.from('support_tickets').insert({
        customer_id: job.customer_id ?? null,
        provider_id: user.id,
        category: 'service',
        title: 'Uyuşmazlık Talebi',
        message: disputeReason.trim(),
        related_job_id: job.id,
        status: 'pending',
      })
    }

    const notifications: any[] = []

    if (job?.customer_id) {
      notifications.push({
        user_id: job.customer_id,
        title: '⚠️ İşte Uyuşmazlık Açıldı',
        body: `"${job.title}" işi için uzman uyuşmazlık talebi oluşturdu: ${disputeReason}`,
        type: 'job_disputed',
        related_job_id: disputeModal.jobId,
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
        body: `"${job?.title}" işi için uzman uyuşmazlık talebi oluşturdu: ${disputeReason}`,
        type: 'job_disputed_admin',
        related_job_id: disputeModal.jobId,
      })
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    setDisputeSubmitting(false)
    setDisputeModal(null)
    setDisputeReason('')
    setResult({ ok: true, msg: 'Uyuşmazlık talebi oluşturuldu. Admin ekibi inceleyecek.' })
    await load()
  }

  const statusPill = (job: any) => {
    switch (job.status) {
      case 'started':
        return {
          text: 'Devam ediyor',
          className:
            'bg-amber-500/12 text-amber-800 ring-1 ring-amber-500/20 border border-amber-200/40',
        }
      case 'accepted':
        return {
          text: 'Bekliyor',
          className:
            'bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/15 border border-emerald-200/50',
        }
      case 'completed':
        return {
          text: 'Tamamlandı',
          className:
            'bg-slate-500/8 text-slate-700 ring-1 ring-slate-400/15 border border-slate-200/60',
        }
      case 'disputed':
        return {
          text: 'Uyuşmazlık',
          className:
            'bg-rose-500/10 text-rose-800 ring-1 ring-rose-400/20 border border-rose-200/50',
        }
      default:
        return {
          text: 'İptal',
          className:
            'bg-slate-400/10 text-slate-600 ring-1 ring-slate-400/15 border border-slate-200/60',
        }
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-100/90 via-slate-50 to-white w-full flex flex-col flex-1 overflow-x-hidden overflow-y-auto pb-28 font-sans antialiased">
      <header className="sticky top-0 z-30 shrink-0 border-b border-white/80 bg-white/85 backdrop-blur-xl px-4 sm:px-5 pt-5 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">İş yönetimi</p>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-0.5">
          Kabul ettiğim işler
        </h1>
        <p className="text-slate-500 text-sm mt-1">QR ile başlat / bitir · müşteriyle hızlı iletişim</p>
      </header>

      {result && (
        <div
          className={`mx-4 sm:mx-5 mt-3 p-3.5 rounded-2xl flex items-start gap-3 animate-scale-in shrink-0 border shadow-sm ${
            result.ok
              ? 'bg-emerald-50/90 border-emerald-200/80'
              : 'bg-red-50/90 border-red-200/80'
          }`}
        >
          <p className={`text-sm font-medium flex-1 leading-snug ${result.ok ? 'text-emerald-900' : 'text-red-800'}`}>
            {result.msg}
          </p>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-0.5"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
      )}

      {/* QR Scanner Modal */}
      {scanModal && (
        <div className="fixed inset-0 bg-black/85 z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto flex flex-col animate-slide-up pb-6">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="font-black text-gray-900">
                {scanModal.action === 'start' ? '📱 Başlangıç QR Okut' : '🏁 Bitiş QR Okut'}
              </p>
              <button
                onClick={() => setScanModal(null)}
                className="text-gray-400 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="shrink-0">
              <QrScanner
                onScan={(data) => handleQRScan(scanModal.jobId, scanModal.action, data)}
              />
            </div>
            <button
              className="btn-secondary mt-4 py-3 text-sm w-full shrink-0"
              onClick={() => {
                setScanModal(null)
                setPinModal(scanModal)
              }}
            >
              🔢 Kodu Elle Gir
            </button>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/85 z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm animate-slide-up space-y-4">
            <p className="font-black text-gray-900 text-center">6 Haneli PIN Gir</p>
            <input className="input text-center text-4xl tracking-[0.5em] font-black py-6"
              type="text" maxLength={6} placeholder="——————"
              value={pin} onChange={e => setPin(e.target.value)} autoFocus />
            <button className="btn-primary py-3.5" onClick={handlePINSubmit} disabled={pin.length < 6}>
              Doğrula
            </button>
            <button className="btn-secondary py-3 text-sm" onClick={() => { setPinModal(null); setPin('') }}>
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-black text-gray-900 text-sm">
                ⚠️ Sorun Bildir / Uyuşmazlık Talebi
              </p>
              <button
                className="text-gray-400 text-xl leading-none"
                onClick={() => !disputeSubmitting && setDisputeModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Kısaca neyin yanlış gittiğini yazın. Bu bilgi admin ekibine ve müşteriye iletilecektir.
            </p>
            <textarea
              className="input text-sm py-2.5 resize-none"
              rows={3}
              placeholder="Örn: Adrese gelindi ama iş tanımı değişti..."
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

      <div className="px-4 sm:px-5 py-5 space-y-5 w-full max-w-lg mx-auto">
        {jobs.map((job) => {
          const pill = statusPill(job)
          const customerPhone = job.profiles?.phone
          const canShowPhone =
            !!customerPhone &&
            (job.status === 'accepted' || job.status === 'started' || job.status === 'completed')

          const showDirections = job.status !== 'completed' && job.status !== 'cancelled'

          const price = Number(job.agreed_price) || 0
          const paytrFee = Math.round(price * 0.0399 * 100) / 100
          const platformFee = Math.round(price * 0.02 * 100) / 100
          const netAmount = Math.round((price - paytrFee - platformFee) * 100) / 100

          const showChat =
            job.status === 'accepted' || job.status === 'started' || job.status === 'completed'

          return (
            <article
              key={job.id}
              className="rounded-3xl border border-slate-200/70 bg-white p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] animate-slide-up"
            >
              {/* Üst: başlık + fiyat + rozet */}
              <div className="flex items-start justify-between gap-3 gap-y-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg ring-1 ring-slate-200/80">
                    {job.service_categories?.icon || <Package className="h-5 w-5 text-slate-500" strokeWidth={2} />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2">
                      {job.title}
                    </h2>
                    {job.service_categories?.name && (
                      <p className="text-xs text-slate-500 mt-1">{job.service_categories.name}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                  <p className="text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
                    ₺{Number(job.agreed_price ?? 0).toLocaleString('tr-TR')}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pill.className}`}
                  >
                    {pill.text}
                  </span>
                </div>
              </div>

              {/* Müşteri / konum / telefon — derli toplu liste */}
              <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2.5 min-w-0">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
                  <span className="leading-snug break-words">{job.address || 'Adres yok'}</span>
                </li>
                <li className="flex items-center gap-2.5 min-w-0">
                  <User className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={2} aria-hidden />
                  <span className="truncate">{job.profiles?.full_name || 'Müşteri'}</span>
                </li>
                <li className="flex items-center gap-2.5 min-w-0">
                  {canShowPhone ? (
                    <>
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={2} aria-hidden />
                      <a
                        href={`tel:${customerPhone}`}
                        className="font-medium text-blue-600 hover:text-blue-700 truncate"
                      >
                        {customerPhone}
                      </a>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-slate-300 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="text-slate-400 text-sm">Numara bu aşamada gizli</span>
                    </>
                  )}
                </li>
              </ul>

              {/* Birincil: QR */}
              <div className="mt-6 space-y-3">
                {job.status === 'accepted' && (
                  <button
                    type="button"
                    onClick={() => setScanModal({ jobId: job.id, action: 'start' })}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-[0.99]"
                  >
                    <QrCode className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                    Başlangıç QR okut
                  </button>
                )}
                {job.status === 'started' && (
                  <button
                    type="button"
                    onClick={() => setScanModal({ jobId: job.id, action: 'end' })}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-[0.99]"
                  >
                    <QrCode className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                    Bitiş QR okut
                  </button>
                )}

                {/* İkincil: mesaj + yol */}
                {(showChat || showDirections) && (
                  <div
                    className={`grid gap-2.5 ${showChat && showDirections ? 'grid-cols-2' : 'grid-cols-1'}`}
                  >
                    {showChat && (
                      <button
                        type="button"
                        onClick={() => openChat(job.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:border-slate-300"
                      >
                        <MessageCircle className="h-4 w-4 text-slate-500 shrink-0" strokeWidth={2} />
                        Mesaj
                      </button>
                    )}
                    {showDirections && (
                      <a
                        href={`https://maps.google.com/?q=${job.lat},${job.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:border-slate-300"
                      >
                        <Navigation className="h-4 w-4 text-slate-500 shrink-0" strokeWidth={2} />
                        Yol tarifi
                      </a>
                    )}
                  </div>
                )}

                {job.status === 'completed' && price > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-3 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                      Ödeme özeti
                    </p>
                    <p>İş bedeli: ₺{price.toFixed(2)}</p>
                    <p>Platform (%2): −₺{platformFee.toFixed(2)}</p>
                    <p>İşlem ücreti (%3,99): −₺{paytrFee.toFixed(2)}</p>
                    <p className="font-semibold text-slate-900 pt-1 border-t border-slate-200/80 mt-2">
                      Hesabına geçecek: ₺{netAmount.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Sorun bildir — en altta, sönük */}
                {(job.status === 'accepted' || job.status === 'started') && (
                  <button
                    type="button"
                    onClick={() => setDisputeModal({ jobId: job.id })}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200/70 bg-orange-50/50 py-2.5 text-xs font-medium text-orange-900/80 transition-colors hover:bg-orange-50/90 hover:border-orange-300/80"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-600/90 shrink-0" strokeWidth={2} />
                    Sorun bildir
                  </button>
                )}
              </div>
            </article>
          )
        })}

        {jobs.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
              <Hammer className="h-7 w-7" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="font-semibold text-slate-800">Henüz kabul ettiğin iş yok</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">Radardan teklif vererek iş alabilirsin.</p>
            <Link
              href="/provider/jobs"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800"
            >
              İşlere git
            </Link>
          </div>
        )}
      </div>

      {/* Spacer: alt menü altında kalmaması için */}
      <div className="h-44 md:h-16 w-full shrink-0 pointer-events-none" aria-hidden />
    </div>
  )
}
