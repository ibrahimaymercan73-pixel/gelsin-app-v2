'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ jobs: 0, providers: 0, pending: 0, revenue: 0, users: 0, escrow: 0 })
  const [recentJobs, setRecentJobs] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const today = new Date(); today.setHours(0,0,0,0)
      const [j, prov, pend, rev, users, esc, recent] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
        supabase.from('provider_profiles').select('id', { count: 'exact' }).eq('is_online', true),
        supabase.from('provider_profiles').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('transactions').select('amount').eq('type', 'commission'),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('jobs').select('agreed_price').eq('escrow_held', true).eq('payment_released', false),
        supabase.from('jobs').select('*, service_categories(name,icon), profiles!jobs_customer_id_fkey(full_name)').order('created_at', { ascending: false }).limit(5),
      ])
      const totalRev = rev.data?.reduce((s, t) => s + t.amount, 0) || 0
      const totalEsc = esc.data?.reduce((s, t) => s + (t.agreed_price || 0), 0) || 0
      setStats({
        jobs: j.count || 0,
        providers: prov.count || 0,
        pending: pend.count || 0,
        revenue: totalRev,
        users: users.count || 0,
        escrow: totalEsc,
      })
      setRecentJobs(recent.data || [])
    }
    load()
  }, [])

  const statCards = [
    { label: "Bugün'ün İşleri", value: stats.jobs, icon: '📋', color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Aktif Ustalar', value: stats.providers, icon: '🟢', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Onay Bekleyen', value: stats.pending, icon: '⏳', color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: 'Havuzdaki Para', value: `₺${stats.escrow}`, icon: '🔒', color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: 'Platform Geliri', value: `₺${stats.revenue.toFixed(0)}`, icon: '💰', color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Toplam Kullanıcı', value: stats.users, icon: '👥', color: 'text-gray-700', bg: 'bg-gray-100' },
  ]

  const statusMap: Record<string, { label: string; cls: string }> = {
    open: { label: 'Açık', cls: 'badge-blue' },
    offered: { label: 'Teklif', cls: 'badge-orange' },
    accepted: { label: 'Kabul', cls: 'badge-green' },
    started: { label: 'Devam', cls: 'badge-orange' },
    completed: { label: 'Bitti', cls: 'badge-green' },
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 pt-14 pb-6 text-white">
        <p className="text-slate-400 text-sm">Admin Paneli</p>
        <h1 className="text-2xl font-black mt-0.5">Kontrol Merkezi</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((s, i) => (
            <div key={s.label} className={`card p-4 animate-slide-up delay-${i % 4 + 1}`}>
              <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center text-lg mb-2`}>
                {s.icon}
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {stats.pending > 0 && (
          <Link href="/admin/approvals">
            <div className="bg-orange-500 rounded-2xl p-4 flex items-center justify-between text-white"
              style={{ boxShadow: '0 4px 20px rgba(249,115,22,0.35)' }}>
              <div>
                <p className="font-black">{stats.pending} usta onay bekliyor</p>
                <p className="text-orange-100 text-xs mt-0.5">Belgeleri incele ve onayla</p>
              </div>
              <span className="text-2xl">→</span>
            </div>
          </Link>
        )}

        <div>
          <p className="font-bold text-gray-800 mb-3">Son İşler</p>
          <div className="space-y-2">
            {recentJobs.map(job => (
              <div key={job.id} className="card p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                  {job.service_categories?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-400">{job.profiles?.full_name || '—'}</p>
                </div>
                <span className={statusMap[job.status]?.cls}>{statusMap[job.status]?.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
