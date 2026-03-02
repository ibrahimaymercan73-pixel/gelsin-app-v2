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

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex w-full overflow-x-hidden">
      
      {/* SOL MENÜ - Bilgisayarda Sabit (Sadece Geniş Ekran) */}
      <aside className="hidden lg:flex w-80 bg-slate-900 flex-col p-8 gap-10 fixed h-full z-50 shadow-2xl">
        <div className="text-3xl font-black text-white italic tracking-tighter">GELSİN.app</div>
        <nav className="flex flex-col gap-4 text-lg">
          <Link href="/customer" className="flex items-center gap-4 p-4 bg-blue-600 text-white rounded-2xl shadow-lg transition-all font-bold italic">🏠 Ana Sayfa</Link>
          <Link href="/customer/jobs" className="flex items-center gap-4 p-4 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all">📋 İşlerim</Link>
          <Link href="/customer/messages" className="flex items-center gap-4 p-4 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all">💬 Mesajlar</Link>
          <Link href="/customer/profile" className="flex items-center gap-4 p-4 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all">👤 Profilim</Link>
        </nav>
      </aside>

      {/* ANA İÇERİK - Boşlukları öldürmek için pl-0 (mobil) ve lg:pl-80 (PC) */}
      <main className="flex-1 w-full lg:ml-80 min-h-screen flex flex-col">
        
        {/* ÜST BAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-40 w-full shadow-sm">
          <h2 className="text-xl font-black text-slate-800 hidden lg:block uppercase tracking-widest">Dashboard</h2>
          <div className="lg:hidden text-2xl font-black text-blue-600 italic">G.</div>
          
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-sm font-black text-slate-900">{userName || 'Kullanıcı'}</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Ev Sahibi</p>
             </div>
             <div className="w-12 h-12 bg-slate-100 border-2 border-white rounded-full flex items-center justify-center text-xl shadow-inner">👤</div>
          </div>
        </header>

        {/* İÇERİK - Tam Ekran Yayılımı */}
        <div className="p-4 lg:p-10 w-full max-w-full flex-1">
          <div className="flex flex-col xl:flex-row gap-10">
            
            {/* SOL TARAF (Geniş alan) */}
            <div className="flex-1 space-y-10">
              <section className="bg-blue-600 rounded-[3rem] p-10 lg:p-16 text-white shadow-2xl relative overflow-hidden flex flex-col items-start justify-center min-h-[400px]">
                <div className="relative z-10">
                  <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block">Hoş Geldin 👋</span>
                  <h1 className="text-5xl lg:text-7xl font-black mb-6 leading-tight tracking-tighter italic">Evin İçin <br/> Bir Usta Çağır.</h1>
                  <Link href="/customer/new-job" className="bg-white text-blue-600 px-12 py-5 rounded-3xl font-black text-xl shadow-2xl hover:scale-105 transition-transform inline-block uppercase">
                    Hemen Başla 🚀
                  </Link>
                </div>
                <div className="absolute right-0 bottom-0 text-[300px] opacity-10 select-none pointer-events-none translate-x-20 translate-y-20">🏠</div>
              </section>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                 {[{i:'🔧',t:'Tamir'},{i:'🧹',t:'Temizlik'},{i:'👕',t:'Ütü'},{i:'🚰',t:'Tesisat'}].map(x=>(
                   <div key={x.t} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all cursor-pointer text-center group">
                      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{x.i}</div>
                      <div className="font-black text-slate-800 text-lg italic uppercase">{x.t}</div>
                   </div>
                 ))}
              </div>
            </div>

            {/* SAĞ TARAF (Harita Paneli) */}
            <div className="w-full xl:w-[450px] space-y-10">
               <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 flex flex-col h-full">
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-3 italic">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                    Ustalar Kapında
                  </h3>
                  <div className="flex-1 min-h-[400px] rounded-[2.5rem] overflow-hidden border-8 border-slate-50 shadow-inner relative">
                    <ProviderMap providers={providers} />
                  </div>
               </div>
            </div>

          </div>
        </div>
      </main>

      {/* REZALET FİX: Sadece mobilde (max-width: 1023px) görünecek menü */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .mobile-nav { display: none !important; }
        }
      `}</style>
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-5 flex justify-between items-center z-[100] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <Link href="/customer" className="text-blue-600 text-3xl">🏠</Link>
        <Link href="/customer/jobs" className="text-slate-300 text-3xl">📋</Link>
        <Link href="/customer/new-job" className="bg-blue-600 w-16 h-16 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl -mt-16 border-[6px] border-[#f1f5f9]">＋</Link>
        <Link href="/customer/messages" className="text-slate-300 text-3xl">💬</Link>
        <Link href="/customer/profile" className="text-slate-300 text-3xl">👤</Link>
      </nav>
    </div>
  )
}