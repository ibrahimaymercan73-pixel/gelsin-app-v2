'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Radar,
  Wallet,
  TrendingUp,
  ChevronRight,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useProviderAuth } from './ProviderLayoutClient'

export default function ProviderDashboard() {
  const { providerName, profile } = useProviderAuth()
  const [stats, setStats] = useState({ active: 0, pending: 0, wallet: 0, total: 0 })
  const faceVerified = !!profile?.face_verified
  const [isOnline, setIsOnline] = useState(false)

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    []
  )

  const initials = useMemo(() => {
    const n = (providerName || 'U').trim()
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }, [providerName])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setStats({ active: 0, pending: 0, wallet: 0, total: 0 })
        return
      }
      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('wallet_balance, is_online')
        .eq('id', user.id)
        .single()
      setIsOnline(pp?.is_online || false)
      const [active, , total, openJobs] = await Promise.all([
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
    {
      label: 'Aktif İş',
      value: String(stats.active),
      sub: 'Devam eden',
      href: '/provider/my-jobs',
      icon: Briefcase,
      gradient: 'from-sky-500/15 via-white to-cyan-500/10',
      ring: 'ring-sky-500/10',
      iconBg: 'bg-sky-500/12 text-sky-600',
    },
    {
      label: 'Bekleyen İş',
      value: String(stats.pending),
      sub: 'Bölgede açık',
      href: '/provider/jobs',
      icon: Radar,
      gradient: 'from-violet-500/15 via-white to-fuchsia-500/10',
      ring: 'ring-violet-500/10',
      iconBg: 'bg-violet-500/12 text-violet-600',
    },
    {
      label: 'Cüzdan',
      value: `₺${stats.wallet.toFixed(1)}`,
      sub: 'Bakiye',
      href: '/provider/wallet',
      icon: Wallet,
      gradient: 'from-emerald-500/15 via-white to-teal-500/10',
      ring: 'ring-emerald-500/10',
      iconBg: 'bg-emerald-500/12 text-emerald-600',
    },
    {
      label: 'Toplam Kazanç',
      value: `₺${stats.total.toFixed(0)}`,
      sub: 'Ödemeler',
      href: '/provider/wallet',
      icon: TrendingUp,
      gradient: 'from-amber-500/12 via-white to-orange-500/10',
      ring: 'ring-amber-500/10',
      iconBg: 'bg-amber-500/12 text-amber-700',
    },
  ]

  return (
    <div className="min-h-screen bg-transparent font-sans">
      <header className="px-5 lg:px-10 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-40 border-b border-white/50 bg-white/55 backdrop-blur-xl supports-[backdrop-filter]:bg-white/40">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden ring-2 ring-white shadow-lg shadow-slate-900/10">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-lg font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.18em]">
              Hoş geldin
            </p>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {providerName || 'Uzman'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 capitalize">{todayLabel}</p>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-md">
              <span className="inline-flex items-center gap-1 font-medium text-violet-700">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Özet:
              </span>{' '}
              {stats.pending} açık iş fırsatı, {stats.active} aktif iş; cüzdan{' '}
              <span className="font-semibold text-emerald-600 tabular-nums">₺{stats.wallet.toFixed(1)}</span>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleOnline}
          className={`self-start sm:self-center flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md ${
            isOnline
              ? 'bg-emerald-500 text-white shadow-emerald-500/25'
              : 'bg-white/90 text-slate-600 border border-slate-200/80 shadow-slate-200/50'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-slate-400'}`}
          />
          {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-8 space-y-8">
        {!faceVerified && (
          <Link href="/provider/verify">
            <div className="rounded-2xl p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-900 flex items-center justify-between gap-4 shadow-sm shadow-amber-500/5">
              <div>
                <p className="font-bold">Kimliğinizi doğrulayın</p>
                <p className="text-sm text-amber-800/90 mt-0.5">
                  Onaylı uzman rozeti için selfie ile kimlik doğrulaması yapın.
                </p>
              </div>
              <span className="bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold text-sm shrink-0">
                Doğrula
              </span>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((s, i) => {
            const Icon = s.icon
            return (
              <Link key={s.label} href={s.href} className="group block">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative overflow-hidden rounded-[1.35rem] p-4 sm:p-5 bg-gradient-to-br ${s.gradient} ring-1 ${s.ring} shadow-[0_2px_20px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.25)] transition-all duration-300 hover:-translate-y-0.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-[13px] font-medium text-slate-600 mt-0.5">{s.label}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{s.sub}</p>
                </motion.div>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Link href="/provider/jobs" className="block group">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/80 backdrop-blur-sm p-6 sm:p-7 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] ring-1 ring-white/60"
            >
              <div className="absolute inset-0 bg-[radial-gradient(800px_200px_at_80%_-20%,rgba(139,92,246,0.12),transparent)] pointer-events-none" />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-1 opacity-40">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-2 w-2 rounded-full bg-violet-400 animate-pulse"
                    style={{ animationDelay: `${d * 0.2}s` }}
                  />
                ))}
              </div>
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
                  <Radar className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-violet-600 uppercase tracking-[0.2em]">
                    Radar
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
                    Yakınındaki işleri keşfet
                  </p>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">
                    Haritada açık ilanları gör, teklif ver — tek dokunuşla listeye git.
                  </p>
                </div>
                <span className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md group-hover:bg-violet-600 transition-colors shrink-0">
                  Aç
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </motion.div>
          </Link>

          <Link href="/provider/my-jobs" className="block group">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-7 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                  <Briefcase className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Devam eden
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {stats.active} aktif iş
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Sürdürdüğün işleri yönet</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0" />
              </div>
            </motion.div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Link href="/provider/wallet">
            <div className="rounded-2xl p-5 border border-white/80 bg-white/70 backdrop-blur-sm shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)] hover:shadow-md transition-all flex items-center gap-4 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Wallet className="h-6 w-6" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Cüzdan
                </p>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">₺{stats.wallet}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <Link href="/provider/profile">
            <div className="rounded-2xl p-5 border border-white/80 bg-white/70 backdrop-blur-sm shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)] hover:shadow-md transition-all flex items-center gap-4 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                <UserRound className="h-6 w-6" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Profil
                </p>
                <p className="text-lg font-bold text-slate-900 truncate">
                  {providerName || 'Düzenle'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
