'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ProviderDashboard() {
  const [stats, setStats] = useState({ active: 0, pending: 0, wallet: 0, total: 0 })
  const [isOnline, setIsOnline] = useState(false)
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setName('')
        setStats({ active: 0, pending: 0, wallet: 0, total: 0 })
        return
      }

      const { data: p } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setName(p?.full_name ?? '')
      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('wallet_balance, is_online')
        .eq('id', user.id)
        .single()
      setIsOnline(pp?.is_online || false)
      const [active, pendingOffers, total, openJobs] = await Promise.all([
        supabase
          .from('jobs')
          .select('id', { count: 'exact' })
          .eq('provider_id', user.id)
          .in('status', ['accepted', 'started']),
        supabase
          .from('offers')
          .select('id', { count: 'exact' })
          .eq('provider_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('transactions')
          .select('amount')
          .eq('to_id', user.id)
          .eq('type', 'provider_payout'),
        supabase
          .from('jobs')
          .select('id', { count: 'exact' })
          .eq('status', 'open'),
      ])
      setStats({
        active: active.count || 0,
        // Bekleyen İş: Uzmanın bölgesinde görebildiği açık işler
        pending: openJobs.count || 0,
        wallet: pp?.wallet_balance || 0,
        total: total.data?.reduce((s, t) => s + t.amount, 0) || 0,
      })
    }
    load()
  }, [])

  const toggleOnline = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }
    await supabase
      .from('provider_profiles')
      .update({ is_online: !isOnline })
      .eq('id', user.id)
    setIsOnline(!isOnline)
  }

  const statCards = [
    { label: 'Aktif İş', value: stats.active, icon: '🔨', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100', href: '/provider/my-jobs' },
    { label: 'Bekleyen İş', value: stats.pending, icon: '💬', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100', href: '/provider/jobs' },
    { label: 'Cüzdan', value: `₺${stats.wallet.toFixed(1)}`, icon: '💰', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', href: '/provider/wallet' },
    { label: 'Toplam Kazanç', value: `₺${stats.total.toFixed(0)}`, icon: '📈', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100', href: '/provider/wallet' },
  ]

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Hoş geldin</p>
          {name === null ? (
            <div className="h-7 w-32 mt-0.5 bg-slate-200 rounded animate-pulse" />
          ) : (
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 mt-0.5">{name || 'Uzman'}</h1>
          )}
        </div>
        <button onClick={toggleOnline}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
            isOnline ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-600 border border-slate-200'
          }`}>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
          {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <Link key={s.label} href={s.href}>
              <div className={`bg-white rounded-2xl p-5 border ${s.border} shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-slide-up`}
                style={{ animationDelay: `${i * 0.06}s` }}>
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-sm text-gray-500 mt-1 font-medium">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link href="/provider/jobs">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-blue-200 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <div className="relative z-10">
                <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-2">Radar</p>
                <p className="text-3xl font-black mb-2">Yakındaki işleri gör</p>
                <p className="text-blue-200 mb-6">Bölgenizdeki açık iş ilanlarına teklif verin</p>
                <span className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold text-sm inline-block">Radarı Aç</span>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-[160px] opacity-10 select-none">🔍</div>
            </div>
          </Link>

          <Link href="/provider/my-jobs">
            <div className="bg-white rounded-[2rem] p-8 lg:p-10 relative overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="relative z-10">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-2">Devam Eden</p>
                <p className="text-3xl font-black text-slate-800 mb-2">{stats.active} Aktif İş</p>
                <p className="text-slate-500 mb-6">Sürdürdüğünüz işleri takip edin</p>
                <span className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm inline-block">İşlerimi Gör</span>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-[160px] opacity-5 select-none">🔨</div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link href="/provider/wallet">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-2xl">💰</div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Cüzdan Bakiyesi</p>
                <p className="text-3xl font-black text-emerald-600">₺{stats.wallet}</p>
              </div>
              <span className="ml-auto text-slate-300 text-2xl">→</span>
            </div>
          </Link>

          <Link href="/provider/profile">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-2xl">👤</div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Profilim</p>
                <p className="text-lg font-black text-slate-800">{name === null ? (
              <span className="inline-block h-5 w-28 bg-slate-200 rounded animate-pulse" />
            ) : (
              name || 'Profili Düzenle'
            )}</p>
              </div>
              <span className="ml-auto text-slate-300 text-2xl">→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
