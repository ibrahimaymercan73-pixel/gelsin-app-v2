'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'
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
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('jobs')
      .select('*, service_categories(name, icon), profiles!jobs_customer_id_fkey(full_name, phone, hide_phone)')
      .eq('provider_id', user!.id)
      .in('status', ['accepted', 'started', 'completed', 'disputed', 'cancelled'])
      .order('created_at', { ascending: false })
    setJobs(data || [])
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
    const supabase = createClient()
    const job = jobs.find(j => j.id === jobId)
    if (action === 'start') {
      await supabase.from('jobs').update({ status: 'started', qr_scanned_at: new Date().toISOString() }).eq('id', jobId)
      await supabase.from('notifications').insert({
        user_id: job.customer_id, title: '🔨 Usta İşe Başladı!',
        body: `"${job.title}" işi başladı.`, type: 'job_started', related_job_id: jobId
      })
      setResult({ ok: true, msg: '✅ İş başlatıldı! Göreve devam edin.' })
    } else {
      await supabase.rpc('release_payment', { p_job_id: jobId })
      await supabase.from('notifications').insert({
        user_id: job.provider_id, title: '💰 Ödemen Cüzdana Aktarıldı!',
        body: `"${job.title}" işi için ödemen cüzdanına aktarıldı.`, type: 'provider_payment_released', related_job_id: jobId
      })
      setResult({ ok: true, msg: '🎉 İş tamamlandı! Ödeme cüzdanınıza aktarıldı.' })
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

    const notifications: any[] = []

    if (job?.customer_id) {
      notifications.push({
        user_id: job.customer_id,
        title: '⚠️ İşte Uyuşmazlık Açıldı',
        body: `"${job.title}" işi için usta uyuşmazlık talebi oluşturdu: ${disputeReason}`,
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
        body: `"${job?.title}" işi için usta uyuşmazlık talebi oluşturdu: ${disputeReason}`,
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

  return (
    <div>
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-900">Kabul Ettiğim İşler</h1>
        <p className="text-gray-500 text-sm mt-0.5">QR okutarak başlat ve bitir</p>
      </div>

      {result && (
        <div className={`mx-4 mt-4 p-4 rounded-2xl flex items-center gap-3 animate-scale-in ${
          result.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`font-semibold text-sm flex-1 ${result.ok ? 'text-emerald-800' : 'text-red-700'}`}>
            {result.msg}
          </p>
          <button onClick={() => setResult(null)} className="text-gray-400 text-lg">✕</button>
        </div>
      )}

      {/* QR Scanner Modal */}
      {scanModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto flex flex-col animate-slide-up pb-8">
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
        <div className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center p-4">
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

      <div className="px-4 py-4 space-y-3">
        {jobs.map(job => {
          const statusLabel =
            job.status === 'started'
              ? { cls: 'badge-orange', text: '🔨 Devam' }
              : job.status === 'accepted'
              ? { cls: 'badge-green', text: '✅ Bekliyor' }
              : job.status === 'completed'
              ? { cls: 'badge-green', text: '✅ Tamamlandı' }
              : job.status === 'disputed'
              ? { cls: 'badge-orange', text: '⚠️ Uyuşmazlık' }
              : { cls: 'badge-red', text: '✖ İptal' }

          const customerPhone =
            job.profiles?.phone || 'Telefon yok'
          const customerHide = !!job.profiles?.hide_phone
          const canShowPhone =
            !customerHide ||
            job.status === 'accepted' ||
            job.status === 'started' ||
            job.status === 'completed'

          const phoneDisplay = canShowPhone ? customerPhone : 'Numara Gizli'

          return (
            <div key={job.id} className="card p-4 animate-slide-up">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {job.service_categories?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{job.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">📍 {job.address}</p>
                <p className="text-xs text-gray-400">
                  👤 {job.profiles?.full_name || (canShowPhone ? customerPhone : 'Müşteri')}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  ☎ {phoneDisplay}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xl font-black text-blue-700">₺{job.agreed_price}</p>
                <span className={statusLabel.cls}>{statusLabel.text}</span>
              </div>
            </div>

            <div className="space-y-2">
              {job.status === 'accepted' && (
                <button className="btn-primary py-3.5"
                  onClick={() => setScanModal({ jobId: job.id, action: 'start' })}>
                  📷 Başlangıç QR Okut
                </button>
              )}
              {job.status === 'started' && (
                <button className="btn-success py-3.5"
                  onClick={() => setScanModal({ jobId: job.id, action: 'end' })}>
                  🏁 Bitiş QR Okut
                </button>
              )}
              {(job.status === 'accepted' || job.status === 'started') && (
                <button
                  className="btn-secondary py-3 text-sm border-amber-300 text-amber-800"
                  onClick={() => setDisputeModal({ jobId: job.id })}
                >
                  ⚠️ Sorun Bildir / İptal Talebi
                </button>
              )}
              {(job.status === 'accepted' || job.status === 'started' || job.status === 'completed') && (
                <button
                  type="button"
                  onClick={() => openChat(job.id)}
                  className="btn-secondary py-3 text-sm text-center w-full"
                >
                  💬 Müşteriyle Mesajlaş
                </button>
              )}
              <a href={`https://maps.google.com/?q=${job.lat},${job.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-secondary py-3 text-sm text-center block">
                🗺️ Yol Tarifi Al
              </a>
            </div>
            </div>
          )
        })}

        {jobs.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-bold text-gray-700">Kabul edilen iş yok</p>
            <Link href="/provider/jobs" className="btn-primary mt-4 px-8 inline-block w-auto py-3 text-sm">
              İşlere Bak
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
