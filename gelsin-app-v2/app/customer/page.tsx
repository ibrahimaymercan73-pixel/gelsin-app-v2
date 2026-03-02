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
    <div className="min-h-screen bg-[#F4F7FA] flex w-full font-sans">
      
      {/* SOL NAV - Daha ince ve zarif */}
      <aside className="hidden lg:flex w-64 bg-slate-900 flex-col fixed h-full z-50 overflow-hidden">
        <div className="p-8 text-xl font-black text-white italic tracking-tighter border-b border-white/5">
          GELSİN<span className="text-blue-500">.</span>
        </div>
        <nav className="p-4 space-y-1 mt-4">
          <Link href="/customer" className="flex items-center gap-3 p-4 bg-blue-600/10 text-blue-400 rounded-2xl font-bold">🏠 Ana Sayfa</Link>
          <Link href="/customer/jobs" className="flex items-center gap-3 p-4 text-slate-400 hover:bg-white/5 rounded-2xl transition-all">📋 İşlerim</Link>
          <Link href="/customer/messages" className="flex items-center gap-3 p-4 text-slate-400 hover:bg-white/5 rounded-2xl transition-all">💬 Mesajlar</Link>
          <Link href="/customer/profile" className="flex items-center gap-3 p-4 text-slate-400 hover:bg-white/5 rounded-2xl transition-all">👤 Profilim</Link>
        </nav>
      </aside>

      {/* ANA İÇERIK - Daha fazla boşluk (lg:ml-64 ve max-w-7xl) */}
      <main className="flex-1 lg:ml-64">
        
        {/* ÜST BAR - Sadeleşti */}
        <header className="px-8 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40">
          <h1 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Müşteri Paneli</h1>
          <div className="flex items-center gap-4 bg-white p-2 pr-5 rounded-full shadow-sm border border-slate-200">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
              {userName?.charAt(0) || 'K'}
            </div>
            <span className="text-sm font-bold text-slate-800">{userName || 'Kullanıcı'}</span>
          </div>
        </header>

        {/* IÇERIK ALANI - Sıkışıklığı çözen ana yer */}
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pb-20">
          
          <div className="flex flex-col xl:flex-row gap-12">
            
            {/* SOL TARAF - Daha ferah akış */}
            <div className="flex-1 space-y-12">
              
              {/* Karşılama Kartı - Yüksekliği azaldı, genişliği arttı */}
              <section className="bg-slate-900 rounded-[2.5rem] p-10 lg:p-14 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-md">
                  <h2 className="text-4xl lg:text-5xl font-black mb-4 leading-[1.1] tracking-tight">Eviniz için en iyi ustalar burada.</h2>
                  <p className="text-slate-400 text-lg mb-8 font-medium">Hemen bir iş ilanı açın, teklifleri toplayın.</p>
                  <Link href="/customer/new-job" className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all inline-block shadow-lg shadow-blue-600/30">
                    Yeni İş Talebi Oluştur 🚀
                  </Link>
                </div>
                <div className="absolute right-[-40px] top-[-40px] text-[300px] text-white/5 font-black pointer-events-none select-none italic">🏠</div>
              </section>

              {/* Kategoriler - Daha küçük ve zarif kutular */}
              <section>
                <div className="flex items-center justify-between mb-6 px-2">
                  <h3 className="font-bold text-slate-800">Popüler Hizmetler</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[{i:'🔧',l:'Tamir'},{i:'🧹',l:'Temizlik'},{i:'⚡',l:'Elektrik'},{i:'🚰',l:'Tesisat'}].map(c=>(
                    <div key={c.l} className="bg-white p-6 rounded-3xl border border-slate-200/60 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group text-center">
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{c.i}</div>
                      <div className="font-bold text-slate-700 text-sm uppercase tracking-wider">{c.l}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* SAĞ TARAF - Harita artık sol tarafı boğmuyor */}
            <div className="w-full xl:w-[380px] shrink-0">
               <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200/60 shadow-sm sticky top-32">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 italic uppercase text-sm tracking-widest">📍 Çevrendeki Ustalar</h3>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                  </div>
                  <div className="h-[450px] rounded-[2rem] overflow-hidden bg-slate-100 relative shadow-inner grayscale-[0.2] contrast-[1.1]">
                    <ProviderMap providers={providers} />
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-700 font-bold leading-relaxed text-center italic">
                      Şu an bölgenizde {providers.length} aktif usta bulunuyor.
                    </p>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </main>

      {/* MOBIL NAV - Gerçekten sadece mobilde */}
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-lg px-8 py-4 flex justify-between items-center z-[100] rounded-[2rem] shadow-2xl border border-white/10">
        <Link href="/customer" className="text-blue-400 text-2xl">🏠</Link>
        <Link href="/customer/jobs" className="text-slate-500 text-2xl font-bold">📋</Link>
        <Link href="/customer/new-job" className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg -mt-12 border-4 border-[#F4F7FA]">＋</Link>
        <Link href="/customer/messages" className="text-slate-500 text-2xl font-bold">💬</Link>
        <Link href="/customer/profile" className="text-slate-500 text-2xl font-bold">👤</Link>
      </nav>

    </div>
  )
}