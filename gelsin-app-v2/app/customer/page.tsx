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
    open: { label: '📢 Teklif Bekleniyor', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    offered: { label: '💬 3 Yeni Teklif', cls: 'bg-amber-100 text-amber-700 border-amber-200 animate-bounce' },
    accepted: { label: '🚗 Usta Yolda', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    started: { label: '🔨 Devam Ediyor', cls: 'bg-orange-50 text-orange-700 border-orange-100' },
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      
      {/* SOL MENÜ (Sidebar) - Bilgisayarda Burası Havalı Durur */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col p-6 gap-8 fixed h-full">
        <div className="text-2xl font-black text-blue-600 tracking-tighter italic">GELSİN.app</div>
        
        <nav className="flex flex-col gap-2">
          <Link href="/customer" className="flex items-center gap-3 p-3 bg-blue-50 text-blue-600 rounded-xl font-bold transition-all">
            <span>🏠</span> Ana Sayfa
          </Link>
          <Link href="/customer/jobs" className="flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <span>📋</span> İşlerim
          </Link>
          <Link href="/customer/messages" className="flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <span>💬</span> Mesajlar
          </Link>
          <Link href="/customer/profile" className="flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <span>👤</span> Profilim
          </Link>
        </nav>

        <div className="mt-auto bg-slate-900 rounded-2xl p-4 text-white">
          <p className="text-xs text-slate-400 font-medium">Destek Hattı</p>
          <p className="text-sm font-bold">0850 123 45 67</p>
          <button className="mt-3 w-full py-2 bg-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors">
            Yardım Al
          </button>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <main className="flex-1 lg:ml-72 pb-24 lg:pb-10">
        
        {/* ÜST BAR */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="lg:hidden text-xl font-black text-blue-600 italic">G.</div>
          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2 hover:bg-slate-100 rounded-full relative">
              🔔 <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{userName || 'Kullanıcı'}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider italic">Ev Sahibi</p>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
                {userName?.charAt(0) || 'K'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-10">
          
          {/* HOŞGELDİN VE ÖZET KARTLARI */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-2">Selam, {userName?.split(' ')[0] || 'Dostum'}! 👋</h2>
                <p className="text-blue-100 font-medium opacity-90 max-w-sm">Bugün evinde halledilmesi gereken bir iş mi var? Biz buradayız.</p>
                <Link href="/customer/new-job" className="inline-block mt-6 px-8 py-3 bg-white text-blue-600 rounded-xl font-black shadow-lg hover:bg-blue-50 transition-all transform hover:-translate-y-1">
                  Yeni İş Talebi Oluştur
                </Link>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-[150px] opacity-10 rotate-12 select-none pointer-events-none">🏠</div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 flex flex-col justify-center items-center text-center shadow-sm">
              <div className="text-4xl mb-2">✨</div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Cüzdan</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight">₺0,00</p>
              <button className="mt-4 text-blue-600 font-bold text-sm hover:underline">Bakiye Yükle →</button>
            </div>
          </section>

          {/* KATEGORİLER - Cezbedici Görünüm */}
          <section>
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-600 rounded-full"></span> 
              Popüler Hizmetler
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                { icon: '🔧', label: 'Tamir', color: 'bg-orange-50 text-orange-600' },
                { icon: '🧹', label: 'Temizlik', color: 'bg-emerald-50 text-emerald-600' },
                { icon: '🏠', label: 'Halı Yıkama', color: 'bg-blue-50 text-blue-600' },
                { icon: '⚡', label: 'Elektrik', color: 'bg-yellow-50 text-yellow-600' },
                { icon: '🚰', label: 'Tesisat', color: 'bg-sky-50 text-sky-600' },
              ].map(cat => (
                <button key={cat.label} className="group p-6 bg-white border border-slate-100 rounded-[1.5rem] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100 transition-all text-center">
                  <div className={`w-12 h-12 ${cat.color} rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                    {cat.icon}
                  </div>
                  <span className="font-bold text-slate-700 text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* AKTİF İŞLER VE HARİTA YAN YANA */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
               <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center justify-between">
                <span>📋 Aktif İşlerin</span>
                <Link href="/customer/jobs" className="text-sm text-blue-600 italic">Tümünü gör</Link>
               </h3>
               <div className="space-y-4">
                  {activeJobs.length > 0 ? activeJobs.map(job => (
                    <div key={job.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-3">
                          <span className="text-2xl">{job.service_categories?.icon}</span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusMap[job.status]?.cls}`}>
                            {statusMap[job.status]?.label}
                          </span>
                       </div>
                       <p className="font-black text-slate-800">{job.title}</p>
                       <p className="text-xs text-slate-500 mt-1 font-medium">Oluşturulma: {new Date(job.created_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                  )) : (
                    <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                      <p className="text-slate-400 font-bold">Şu an aktif bir işin yok.</p>
                    </div>
                  )}
               </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span>📍 Çevrendeki Ustalar</span>
                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse">CANLI</span>
              </h3>
              <div className="rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl h-[350px] relative">
                <ProviderMap providers={providers} />
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* MOBİL ALT MENÜ - Sadece küçük ekranlarda görünür */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <Link href="/customer" className="text-blue-600 text-2xl">🏠</Link>
        <Link href="/customer/jobs" className="text-slate-400 text-2xl">📋</Link>
        <Link href="/customer/new-job" className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl shadow-lg -mt-10 border-4 border-[#f8fafc]">＋</Link>
        <Link href="/customer/messages" className="text-slate-400 text-2xl">💬</Link>
        <Link href="/customer/profile" className="text-slate-400 text-2xl">👤</Link>
      </nav>
    </div>
  )
}