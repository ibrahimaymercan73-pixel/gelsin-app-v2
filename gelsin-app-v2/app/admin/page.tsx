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
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const [j, prov, pend, rev, users, esc, recent] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
        supabase.from('provider_profiles').select('id', { count: 'exact' }).eq('is_online', true),
        supabase.from('provider_profiles').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('transactions').select('amount').eq('type', 'commission'),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('jobs').select('agreed_price').eq('escrow_held', true).eq('payment_released', false),
        supabase.from('jobs')
          .select('*, service_categories(name,icon), profiles!jobs_customer_id_fkey(full_name)')
          .order('created_at', { ascending: false }).limit(8),
      ])
      const totalRev = rev.data?.reduce((s, t) => s + t.amount, 0) || 0
      const totalEsc = esc.data?.reduce((s, t) => s + (t.agreed_price || 0), 0) || 0
      setStats({ jobs: j.count || 0, providers: prov.count || 0, pending: pend.count || 0, revenue: totalRev, users: users.count || 0, escrow: totalEsc })
      setRecentJobs(recent.data || [])
    }
    load()
  }, [])

  const statCards = [
    { label: "Bugün'ün İşleri", value: stats.jobs, icon: '📋', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Aktif Ustalar', value: stats.providers, icon: '🟢', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Onay Bekleyen', value: stats.pending, icon: '⏳', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: 'Havuzdaki Para', value: `₺${stats.escrow}`, icon: '🔒', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: 'Platform Geliri', value: `₺${stats.revenue.toFixed(0)}`, icon: '💰', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'Toplam Kullanıcı', value: stats.users, icon: '👥', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100' },
  ]

  const statusMap: Record<string, { label: string; cls: string }> = {
    open: { label: 'Açık', cls: 'badge-blue' },
    offered: { label: 'Teklif', cls: 'badge-orange' },
    accepted: { label: 'Kabul', cls: 'badge-green' },
    started: { label: 'Devam', cls: 'badge-orange' },
    completed: { label: 'Bitti', cls: 'badge-green' },
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Admin Paneli</p>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 mt-0.5">Kontrol Merkezi</h1>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
          <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-xs text-white font-bold">A</div>
          <span className="text-sm font-bold text-slate-700 hidden sm:block">Admin</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-8">
        {stats.pending > 0 && (
          <Link href="/admin/approvals">
            <div className="bg-orange-500 rounded-2xl p-5 flex items-center justify-between text-white shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all">
              <div>
                <p className="font-black text-base">{stats.pending} usta onay bekliyor</p>
                <p className="text-orange-100 text-sm mt-0.5">Belgeleri incele ve onayla</p>
              </div>
              <span className="text-3xl">⏳</span>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((s, i) => (
            <div key={s.label} className={`bg-white rounded-2xl p-5 lg:p-6 border ${s.border} shadow-sm animate-slide-up`}
              style={{ animationDelay: `${i * 0.06}s` }}>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-800">Son İşler</h2>
              <Link href="/admin/live" className="text-sm text-blue-600 font-bold hover:underline">Tümünü Gör →</Link>
            </div>
            <div className="space-y-2">
              {recentJobs.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-100">Henüz iş yok</div>
              )}
              {recentJobs.map(job => (
                <div key={job.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg shrink-0">{job.service_categories?.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{job.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{job.profiles?.full_name || '—'}</p>
                  </div>
                  {job.agreed_price && <p className="text-sm font-black text-emerald-600 shrink-0">₺{job.agreed_price}</p>}
                  <span className={`${statusMap[job.status]?.cls} shrink-0`}>{statusMap[job.status]?.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-black text-slate-800 mb-4">Hızlı Erişim</h2>
            <div className="space-y-3">
              {[
                { href: '/admin/approvals', icon: '✅', title: 'Onay Bekleyenler', desc: `${stats.pending} usta`, color: 'bg-orange-50 border-orange-100' },
                { href: '/admin/live', icon: '🗺️', title: 'Canlı Harita', desc: `${stats.providers} aktif usta`, color: 'bg-blue-50 border-blue-100' },
                { href: '/admin/finance', icon: '💰', title: 'Finanslar', desc: `₺${stats.revenue.toFixed(0)} gelir`, color: 'bg-emerald-50 border-emerald-100' },
                { href: '/admin/users', icon: '👥', title: 'Kullanıcılar', desc: `${stats.users} kayıtlı`, color: 'bg-slate-50 border-slate-100' },
              ].map(item => (
                <Link key={item.href} href={item.href}>
                  <div className={`${item.color} border rounded-2xl p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-all`}>
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <span className="ml-auto text-slate-400">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
