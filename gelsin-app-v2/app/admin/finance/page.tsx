'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

type PaymentRow = {
  id: string
  job_id: string
  amount: number
  paytr_fee: number | null
  platform_fee: number
  provider_amount: number
  status: string
  transfer_status: string | null
  created_at: string
}

export default function AdminFinancePage() {
  const [escrowJobs, setEscrowJobs] = useState<any[]>([])
  const [processing, setProcessing] = useState<string | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [jobsById, setJobsById] = useState<Record<string, { title: string }>>({})

  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()

    const [{ data: ej }, { data: pay }] = await Promise.all([
      supabase
        .from('jobs')
        .select(
          '*, service_categories(name, icon), profiles!jobs_customer_id_fkey(full_name, phone)'
        )
        .eq('escrow_held', true)
        .eq('payment_released', false)
        .in('status', ['started', 'completed'])
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select(
          'id, job_id, amount, paytr_fee, platform_fee, provider_amount, status, transfer_status, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    const paymentRows = (pay as any as PaymentRow[]) || []
    setPayments(paymentRows)

    const jobIds = Array.from(
      new Set(paymentRows.map((p) => p.job_id).filter((x): x is string => !!x))
    )
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title')
        .in('id', jobIds)
      const map: Record<string, { title: string }> = {}
      for (const j of jobs || []) {
        map[j.id as string] = { title: j.title as string }
      }
      setJobsById(map)
    } else {
      setJobsById({})
    }

    setEscrowJobs(ej || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const stats = useMemo(() => {
    const totalGross = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const totalPaytrFee = payments.reduce((s, p) => s + Number(p.paytr_fee || 0), 0)
    const totalPlatform = payments.reduce((s, p) => s + Number(p.platform_fee || 0), 0)
    const totalEscrow = payments
      .filter((p) => p.status === 'in_escrow' || p.status === 'disputed')
      .reduce((s, p) => s + Number(p.provider_amount || 0), 0)

    const netPlatform = totalPlatform - totalPaytrFee

    return { totalGross, totalPaytrFee, totalPlatform, netPlatform, totalEscrow }
  }, [payments])

  const releasePayment = async (jobId: string) => {
    setProcessing(jobId)
    const supabase = createClient()
    const { error } = await supabase.rpc('release_payment', { p_job_id: jobId })
    if (!error) await load()
    setProcessing(null)
  }

  const statusBadge = (p: PaymentRow) => {
    if (p.status === 'refunded') {
      return { label: 'İade Edildi', className: 'bg-rose-100 text-rose-700' }
    }
    if (p.status === 'released') {
      if (p.transfer_status === 'completed') {
        return { label: 'Banka İşlemi Başarılı', className: 'bg-emerald-100 text-emerald-700' }
      }
      if (p.transfer_status === 'failed') {
        return { label: 'IBAN Hatalı / Döndü', className: 'bg-rose-100 text-rose-700' }
      }
      return { label: 'Uzmana Gönderildi', className: 'bg-blue-100 text-blue-700' }
    }
    if (p.status === 'in_escrow') {
      return { label: 'Havuzda Bekliyor', className: 'bg-amber-100 text-amber-800' }
    }
    if (p.status === 'disputed') {
      return { label: 'İtirazlı', className: 'bg-amber-100 text-amber-800' }
    }
    return { label: p.status, className: 'bg-slate-100 text-slate-700' }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-surface-900" style={{fontFamily:'Syne,sans-serif'}}>
          Finans Yönetimi
        </h1>
        <p className="text-surface-500 mt-1">Escrow havuzu ve ödemeler</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-sky-400">
          <p className="text-surface-500 text-sm">Toplam Ciro</p>
          <p className="text-2xl md:text-3xl font-extrabold text-surface-900 mt-1">
            ₺{stats.totalGross.toFixed(0)}
          </p>
          <p className="text-xs text-surface-400 mt-1">Tüm ödemelerin brüt toplamı</p>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-400">
          <p className="text-surface-500 text-sm">Kesilen POS Ücreti (PayTR)</p>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-700 mt-1">
            ₺{stats.totalPaytrFee.toFixed(0)}
          </p>
          <p className="text-xs text-surface-400 mt-1">%3.99 POS maliyeti</p>
        </div>
        <div className="card p-5 border-l-4 border-l-brand-400">
          <p className="text-surface-500 text-sm">Toplam Platform Komisyonu</p>
          <p className="text-2xl md:text-3xl font-extrabold text-brand-600 mt-1">
            ₺{stats.totalPlatform.toFixed(0)}
          </p>
          <p className="text-xs text-surface-400 mt-1">%2 oranında toplam</p>
        </div>
        <div className="card p-5 border-l-4 border-l-emerald-400">
          <p className="text-surface-500 text-sm">Net Platform Kazancı</p>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-700 mt-1">
            ₺{stats.netPlatform.toFixed(0)}
          </p>
          <p className="text-xs text-surface-400 mt-1">Komisyon − POS ücreti</p>
        </div>
      </div>

      {/* Escrow pool summary */}
      <div className="card p-4 border border-amber-100 bg-amber-50/50">
        <p className="text-sm font-semibold text-amber-900">
          Havuzdaki (içerideki) toplam para:{' '}
          <span className="font-extrabold">₺{stats.totalEscrow.toFixed(0)}</span>
        </p>
        <p className="text-xs text-amber-800 mt-1">
          Henüz uzmana aktarılmamış, in_escrow veya itirazlı (disputed) ödemelerin ustaya net geçecek
          toplam tutarı.
        </p>
      </div>

      {/* Escrow Jobs */}
      <div className="card p-5">
        <h2 className="font-bold text-surface-800 mb-4">
          Havuzda Bekleyen Ödemeler ({escrowJobs.length})
        </h2>

        {escrowJobs.length === 0 ? (
          <div className="text-center py-8 text-surface-400">
            <div className="text-4xl mb-2">✅</div>
            <p>Bekleyen ödeme yok</p>
          </div>
        ) : (
          <div className="space-y-3">
              {escrowJobs.map(job => {
              const commission = (job.agreed_price || 0) * 0.02
              const providerAmount = (job.agreed_price || 0) - commission

              return (
                <div key={job.id} className="border border-surface-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">
                        {job.service_categories?.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-surface-900">{job.title}</p>
                        <p className="text-xs text-surface-400">{job.profiles?.full_name} · {job.address}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      job.status === 'started' ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {job.status === 'started' ? '🔨 Devam Ediyor' : '✅ Tamamlandı'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-surface-50 rounded-xl p-3 text-sm mb-3">
                    <div>
                      <p className="text-surface-400 text-xs">Toplam Fiyat</p>
                      <p className="font-bold text-surface-900">₺{job.agreed_price}</p>
                    </div>
                    <div>
                      <p className="text-surface-400 text-xs">Komisyon (%2)</p>
                      <p className="font-bold text-brand-600">₺{commission.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400 text-xs">Uzmana Ödenecek</p>
                      <p className="font-bold text-emerald-600">₺{providerAmount.toFixed(0)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => releasePayment(job.id)}
                    disabled={processing === job.id}
                    className="btn-primary text-sm w-full"
                  >
                    {processing === job.id ? 'İşleniyor...' : '💸 Ödemeyi Serbest Bırak'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detailed ledger */}
      <div className="card p-5">
        <h2 className="font-bold text-surface-800 mb-4">Detaylı Finans Tablosu</h2>
        {loading ? (
          <p className="text-sm text-surface-500">Yükleniyor...</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-surface-500">Henüz ödeme kaydı bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-surface-600">İş / Hizmet</th>
                  <th className="px-3 py-2 text-left font-semibold text-surface-600">Tarih</th>
                  <th className="px-3 py-2 text-right font-semibold text-surface-600">Brüt Tutar</th>
                  <th className="px-3 py-2 text-right font-semibold text-surface-600">PayTR POS (%3.99)</th>
                  <th className="px-3 py-2 text-right font-semibold text-surface-600">Gelsin Komisyonu (%2)</th>
                  <th className="px-3 py-2 text-right font-semibold text-surface-600">
                    Uzmana Net (Geçecek/Geçen)
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-surface-600">Durum</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const job = jobsById[p.job_id]
                  const posFee =
                    p.paytr_fee != null ? Number(p.paytr_fee || 0) : Number(p.amount || 0) * 0.0399
                  const platformFee = Number(p.platform_fee || 0)
                  const providerNet = Number(p.provider_amount || 0)
                  const badge = statusBadge(p)

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-surface-50 hover:bg-surface-50/60 transition-colors"
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-surface-900 text-xs md:text-sm">
                            {job?.title || 'İş Başlığı Yok'}
                          </span>
                          <span className="text-[11px] text-surface-400 mt-0.5 truncate">
                            #{p.job_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-surface-600 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2 align-top text-right font-semibold text-surface-900">
                        ₺{Number(p.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 align-top text-right text-amber-700 font-medium">
                        ₺{posFee.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 align-top text-right text-brand-700 font-medium">
                        ₺{platformFee.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 align-top text-right text-emerald-700 font-semibold">
                        ₺{providerNet.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
