'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ProviderDashboard() {
  const [stats, setStats] = useState({ active: 0, pending: 0, wallet: 0, total: 0 })
  const [isOnline, setIsOnline] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
      setName(p?.full_name || '')
      const { data: pp } = await supabase.from('provider_profiles')
        .select('wallet_balance, is_online').eq('id', user!.id).single()
      setIsOnline(pp?.is_online || false)
      const [active, pending, total] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact' }).eq('provider_id', user!.id).in('status', ['accepted','started']),
        supabase.from('offers').select('id', { count: 'exact' }).eq('provider_id', user!.id).eq('status', 'pending'),
        supabase.from('transactions').select('amount').eq('to_id', user!.id).eq('type', 'provider_payout'),
      ])
      setStats({
        active: active.count || 0,
        pending: pending.count || 0,
        wallet: pp?.wallet_balance || 0,
        total: total.data?.reduce((s, t) => s + t.amount, 0) || 0,
      })
    }
    load()
  }, [])

  const toggleOnline = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('provider_profiles').update({ is_online: !isOnline }).eq('id', user!.id)
    setIsOnline(!isOnline)
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-sm">Hoş geldin 👷</p>
            <h1 className="text-xl font-black mt-0.5">{name || 'Usta'}</h1>
          </div>
          <button onClick={toggleOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
              isOnline ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'
            }`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
            {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Aktif İş', value: stats.active, icon: '🔨', color: 'text-blue-700', bg: 'bg-blue-50', href: '/provider/my-jobs' },
            { label: 'Bekleyen Teklif', value: stats.pending, icon: '💬', color: 'text-orange-700', bg: 'bg-orange-50', href: '/provider/jobs' },
            { label: 'Cüzdan', value: `₺${stats.wallet}`, icon: '💰', color: 'text-emerald-700', bg: 'bg-emerald-50', href: '/provider/wallet' },
            { label: 'Toplam Kazanç', value: `₺${stats.total.toFixed(0)}`, icon: '📈', color: 'text-purple-700', bg: 'bg-purple-50', href: '/provider/wallet' },
          ].map(s => (
            <Link key={s.label} href={s.href}>
              <div className="card p-4 active:scale-98 transition-transform">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center text-lg mb-2`}>{s.icon}</div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/provider/jobs">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 flex items-center justify-between text-white"
            style={{ boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}>
            <div>
              <p className="font-black text-base">Radar'ı Aç</p>
              <p className="text-blue-200 text-xs mt-0.5">Yakınındaki işleri gör, teklif ver</p>
            </div>
            <div className="text-3xl">🔍</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
