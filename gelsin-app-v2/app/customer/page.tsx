'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ProviderMap = dynamic(() => import('@/components/ProviderMap'), { ssr: false })

export default function CustomerHome() {
  const [userName, setUserName] = useState('')
  const [providers, setProviders] = useState<any[]>([])
  const [activeJobs, setActiveJobs] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
      setUserName(p?.full_name || p?.phone || '')
      const { data: prov } = await supabase.from('provider_profiles')
        .select('*, profiles(full_name)').eq('is_online', true).eq('status', 'approved')
      setProviders(prov || [])
      const { data: jobs } = await supabase.from('jobs')
        .select('*, service_categories(name, icon)')
        .eq('customer_id', user.id)
        .in('status', ['open', 'offered', 'accepted', 'started'])
        .order('created_at', { ascending: false }).limit(3)
      setActiveJobs(jobs || [])
    }
    load()
  }, [])

  const statusMap: Record<string, { label: string; cls: string }> = {
    open: { label: '📢 Teklif Bekleniyor', cls: 'badge-blue' },
    offered: { label: '💬 Teklif Var', cls: 'badge-orange' },
    accepted: { label: '🚗 Usta Yolda', cls: 'badge-green' },
    started: { label: '🔨 Devam Ediyor', cls: 'badge-orange' },
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-300 text-sm">{greeting} 👋</p>
            <h1 className="text-xl font-black mt-0.5">{userName || 'Hoş geldiniz!'}</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-white font-medium">{providers.length} usta aktif</span>
          </div>
        </div>

        {/* Hızlı aksiyonlar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🔧', label: 'Tamir', href: '/customer/new-job?cat=repair' },
            { icon: '🧹', label: 'Temizlik', href: '/customer/new-job?cat=cleaning' },
            { icon: '🏠', label: 'Halı Yıkama', href: '/customer/new-job?cat=carpet' },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-2xl p-3.5 text-center transition-all active:scale-95">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xs font-semibold text-white">{item.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Aktif işler */}
        {activeJobs.length > 0 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800">Aktif İşlerim</p>
              <Link href="/customer/jobs" className="text-blue-600 text-sm font-semibold">Tümü →</Link>
            </div>
            <div className="space-y-2">
              {activeJobs.map(job => (
                <Link key={job.id} href={`/customer/jobs/${job.id}`}>
                  <div className="card p-4 flex items-center gap-3 active:scale-99 transition-transform">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {job.service_categories?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{job.title}</p>
                      <span className={`${statusMap[job.status]?.cls} mt-0.5`}>
                        {statusMap[job.status]?.label}
                      </span>
                    </div>
                    <span className="text-gray-300">›</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Harita */}
        <div className="animate-slide-up delay-1">
          <p className="font-bold text-gray-800 mb-3">Yakınımdaki Ustalar</p>
          <div className="card overflow-hidden" style={{ height: '200px' }}>
            <ProviderMap providers={providers} />
          </div>
        </div>

        {/* CTA */}
        <Link href="/customer/new-job" className="animate-slide-up delay-2 block">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 flex items-center justify-between text-white"
            style={{ boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}>
            <div>
              <p className="font-black text-base">Yeni İş Aç</p>
              <p className="text-blue-200 text-xs mt-0.5">Teklifleri al, en iyisini seç</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">➕</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
