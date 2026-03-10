'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

type DisputeRow = {
  id: string
  status: string
  title: string | null
  created_at: string
  related_job_id: string | null
  customer_id: string | null
  provider_id: string | null
  customer?: { full_name: string | null }[] | { full_name: string | null }
  provider?: { full_name: string | null }[] | { full_name: string | null }
}

function getName(x: any): string {
  if (!x) return '—'
  if (Array.isArray(x)) return x[0]?.full_name || '—'
  return x.full_name || '—'
}

function statusBadge(s: string) {
  switch (s) {
    case 'open':
      return 'bg-amber-100 text-amber-800'
    case 'resolved_refund':
      return 'bg-rose-100 text-rose-800'
    case 'resolved_provider':
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function statusLabel(s: string) {
  switch (s) {
    case 'open':
      return 'Açık'
    case 'resolved_refund':
      return 'İade ile çözüldü'
    case 'resolved_provider':
      return 'Ustaya ödeme ile çözüldü'
    default:
      return s
  }
}

export default function AdminDisputesPage() {
  const [rows, setRows] = useState<DisputeRow[]>([])
  const [jobsById, setJobsById] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('support_tickets')
      .select(
        `
        id,
        status,
        title,
        created_at,
        related_job_id,
        customer_id,
        provider_id,
        customer:profiles!support_tickets_customer_id_fkey(full_name),
        provider:profiles!support_tickets_provider_id_fkey(full_name)
      `
      )
      .in('status', ['open', 'resolved_refund', 'resolved_provider'])
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Anlaşmazlıklar yüklenemedi: ' + error.message)
      setRows([])
      setJobsById({})
      setLoading(false)
      return
    }

    const list = (data as any as DisputeRow[]) || []
    setRows(list)

    const jobIds = Array.from(
      new Set(list.map((r) => r.related_job_id).filter((x): x is string => !!x))
    )

    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, agreed_price, provider_id, customer_id')
        .in('id', jobIds)
      const map: Record<string, any> = {}
      for (const j of jobs || []) map[j.id] = j
      setJobsById(map)
    } else {
      setJobsById({})
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openCount = useMemo(() => rows.filter((r) => r.status === 'open').length, [rows])

  const refund = async (r: DisputeRow) => {
    if (!r.related_job_id) return
    const ok = window.confirm('Bu anlaşmazlık iade ile çözülecek. Emin misiniz?')
    if (!ok) return

    setProcessingId(r.id)
    try {
      const supabase = createClient()
      const { data: payment } = await supabase
        .from('payments')
        .select('id')
        .eq('job_id', r.related_job_id)
        .eq('status', 'in_escrow')
        .maybeSingle()

      if (!payment?.id) {
        toast.error('Bu iş için iade edilebilir (in_escrow) ödeme bulunamadı.')
        return
      }

      const res = await fetch('/api/paytr/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: payment.id, support_ticket_id: r.id }),
      })
      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'İade işlemi başarısız oldu.')
        return
      }
      toast.success('İade başlatıldı.')
      await load()
    } finally {
      setProcessingId(null)
    }
  }

  const payout = async (r: DisputeRow) => {
    if (!r.related_job_id) return
    const ok = window.confirm('Bu anlaşmazlık ustaya ödeme ile çözülecek. Emin misiniz?')
    if (!ok) return

    setProcessingId(r.id)
    try {
      const res = await fetch('/api/paytr/release-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: r.related_job_id, support_ticket_id: r.id }),
      })
      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Ödeme işlemi başarısız oldu.')
        return
      }
      toast.success('Ustaya ödeme başlatıldı.')
      await load()
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">⚖️ Anlaşmazlıklar</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Açık anlaşmazlıklar: <span className="font-bold text-slate-800">{openCount}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800"
        >
          Yenile
        </button>
      </header>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500">
          Yükleniyor...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500">
          Kayıt yok.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tarih</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Müşteri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Usta</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">İş</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tutar</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Durum</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const job = r.related_job_id ? jobsById[r.related_job_id] : null
                  const amount = Number(job?.agreed_price || 0)
                  const disabled = r.status !== 'open' || processingId === r.id
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-800">{getName(r.customer)}</td>
                      <td className="px-4 py-3 text-slate-800">{getName(r.provider)}</td>
                      <td className="px-4 py-3 text-slate-800">{job?.title || (r.title ?? '—')}</td>
                      <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                        {amount > 0 ? `₺${amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${statusBadge(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => refund(r)}
                            disabled={disabled}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold disabled:opacity-50"
                          >
                            {processingId === r.id ? 'İşleniyor...' : 'İade Et'}
                          </button>
                          <button
                            type="button"
                            onClick={() => payout(r)}
                            disabled={disabled}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                          >
                            {processingId === r.id ? 'İşleniyor...' : 'Ustaya Öde'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

