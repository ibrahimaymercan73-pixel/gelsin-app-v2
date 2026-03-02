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

  // CSS class'larını Tailwind'in kendi renkleriyle güncelledim ki global.css'e muhtaç kalmasın
  const statusMap: Record<string, { label: string; cls: string }> = {
    open: { label: '📢 Teklif Bekleniyor', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    offered: { label: '💬 Teklif Var', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    accepted: { label: '🚗 Usta Yolda', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    started: { label: '🔨 Devam Ediyor', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500 selection:text-white pb-20 lg:pb-10">
      
      {/* Üst Karşılama Alanı (Banner) */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 lg:pb-24 pb-12 pt-12 lg:pt-16 shadow-lg lg:rounded-b-[3rem]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="animate-fade-in">
              <p className="text-blue-200 text-lg font-medium mb-1">{greeting} 👋</p>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                {userName || 'Hoş Geldiniz!'}
              </h1>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 self-start md:self-auto animate-fade-in">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <span className="text-sm text-white font-bold tracking-wide">{providers.length} Usta Aktif</span>
            </div>
          </div>

          {/* Hızlı Aksiyonlar - Bilgisayarda makul boyutta, telefonda 3'lü ızgara */}
          <div className="grid grid-cols-3 gap-4 lg:max-w-3xl animate-slide-up">
            {[
              { icon: '🔧', label: 'Tamir', href: '/customer/new-job?cat=repair' },
              { icon: '🧹', label: 'Temizlik', href: '/customer/new-job?cat=cleaning' },
              { icon: '🏠', label: 'Halı Yıkama', href: '/customer/new-job?cat=carpet' },
            ].map(item => (
              <Link key={item.label} href={item.href}
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 rounded-2xl p-4 lg:p-6 flex flex-col items-center justify-center transition-all hover:-translate-y-1 shadow-sm">
                <div className="text-3xl lg:text-4xl mb-3 drop-shadow-md">{item.icon}</div>
                <div className="text-sm lg:text-base font-bold text-white tracking-wide">{item.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Ana İçerik Izgarası (Grid) */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 -mt-6 lg:-mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          
          {/* Sol Sütun: Aktif İşler (Bilgisayarda daha geniş alan kaplar) */}
          <div className="lg:col-span-8 space-y-6">
            {activeJobs.length > 0 ? (
              <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-slide-up delay-1">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Aktif İşlerim</h2>
                  <Link href="/customer/jobs" className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors">
                    Tümü <span className="text-lg">→</span>
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {activeJobs.map(job => (
                    <Link key={job.id} href={`/customer/jobs/${job.id}`} className="block group">
                      <div className="p-4 lg:p-5 flex items-center gap-4 lg:gap-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all">
                        <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                          {job.service_categories?.icon || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-base lg:text-lg truncate mb-1">{job.title}</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusMap[job.status]?.cls}`}>
                            {statusMap[job.status]?.label}
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-sm">
                          →
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-slide-up delay-1">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Henüz Aktif İşiniz Yok</h3>
                <p className="text-slate-500 font-medium">İhtiyacınız olan hizmet için hemen yeni bir iş talebi oluşturun.</p>
              </div>
            )}
          </div>

          {/* Sağ Sütun: Harita ve Yeni İş Butonu */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Dev Yeni İş Aç Butonu */}
            <Link href="/customer/new-job" className="block animate-slide-up delay-2 group">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 lg:p-8 flex items-center justify-between text-white shadow-[0_10px_40px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_50px_rgba(37,99,235,0.4)] hover:-translate-y-1 transition-all">
                <div>
                  <h3 className="text-2xl font-black mb-1">Yeni İş Aç</h3>
                  <p className="text-blue-100 text-sm font-medium">Hemen teklifleri almaya başla</p>
                </div>
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl group-hover:bg-white group-hover:text-blue-600 group-hover:rotate-90 transition-all duration-300">
                  ➕
                </div>
              </div>
            </Link>

            {/* Harita Kartı */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-slide-up delay-3">
              <h2 className="text-xl font-black text-slate-800 tracking-tight mb-4">Yakınımdaki Ustalar</h2>
              <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50 relative" style={{ height: '300px' }}>
                <ProviderMap providers={providers} />
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}