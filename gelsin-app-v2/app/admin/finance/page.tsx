'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminFinancePage() {
  const [escrowJobs, setEscrowJobs] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [processing, setProcessing] = useState<string | null>(null)
  const [stats, setStats] = useState({ totalEscrow: 0, totalCommission: 0, totalPayout: 0 })

  const load = async () => {
    const supabase = createClient()

    const [{ data: ej }, { data: tx }] = await Promise.all([
      supabase.from('jobs')
        .select('*, service_categories(name, icon), profiles!jobs_customer_id_fkey(full_name, phone)')
        .eq('escrow_held', true)
        .eq('payment_released', false)
        .in('status', ['started', 'completed'])
        .order('created_at', { ascending: false }),
      supabase.from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setEscrowJobs(ej || [])
    setTransactions(tx || [])

    const totalEscrow = (ej || []).reduce((s: number, j: any) => s + (j.agreed_price || 0), 0)
    const { data: commissions } = await supabase.from('transactions').select('amount').eq('type', 'commission')
    const { data: payouts } = await supabase.from('transactions').select('amount').eq('type', 'provider_payout')
    setStats({
      totalEscrow,
      totalCommission: (commissions || []).reduce((s: number, t: any) => s + t.amount, 0),
      totalPayout: (payouts || []).reduce((s: number, t: any) => s + t.amount, 0),
    })
  }

  useEffect(() => { load() }, [])

  const releasePayment = async (jobId: string) => {
    setProcessing(jobId)
    const supabase = createClient()
    const { error } = await supabase.rpc('release_payment', { p_job_id: jobId })
    if (!error) await load()
    setProcessing(null)
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-surface-900" style={{fontFamily:'Syne,sans-serif'}}>
          Finans Yönetimi
        </h1>
        <p className="text-surface-500 mt-1">Escrow havuzu ve ödemeler</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-l-amber-400">
          <p className="text-surface-500 text-sm">Escrow Havuzu</p>
          <p className="text-3xl font-extrabold text-surface-900 mt-1">₺{stats.totalEscrow.toFixed(0)}</p>
          <p className="text-xs text-surface-400 mt-1">Bekleyen ödeme</p>
        </div>
        <div className="card p-5 border-l-4 border-l-brand-400">
          <p className="text-surface-500 text-sm">Platform Komisyonu</p>
          <p className="text-3xl font-extrabold text-brand-600 mt-1">₺{stats.totalCommission.toFixed(0)}</p>
          <p className="text-xs text-surface-400 mt-1">%2 oranında</p>
        </div>
        <div className="card p-5 border-l-4 border-l-emerald-400">
          <p className="text-surface-500 text-sm">Uzman Ödemeleri</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">₺{stats.totalPayout.toFixed(0)}</p>
          <p className="text-xs text-surface-400 mt-1">Toplam ödenen</p>
        </div>
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

      {/* Transaction History */}
      <div className="card p-5">
        <h2 className="font-bold text-surface-800 mb-4">Son İşlemler</h2>
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  tx.type === 'commission' ? 'bg-brand-50 text-brand-600' :
                  tx.type === 'provider_payout' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {tx.type === 'commission' ? '💼' : tx.type === 'provider_payout' ? '💸' : '🔒'}
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-800">
                    {tx.type === 'commission' ? 'Platform Komisyonu' :
                     tx.type === 'provider_payout' ? 'Uzman Ödemesi' : 'Escrow'}
                  </p>
                  <p className="text-xs text-surface-400">
                    {new Date(tx.created_at).toLocaleString('tr-TR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
              </div>
              <span className={`font-bold ${tx.type === 'commission' ? 'text-brand-600' : 'text-emerald-600'}`}>
                ₺{tx.amount.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
