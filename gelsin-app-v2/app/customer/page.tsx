'use client'
// ... (importlar aynı kalıyor, sadece return kısmındaki yapıyı jilet gibi yapıyoruz)
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
    offered: { label: '💬 3 Yeni Teklif', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    accepted: { label: '🚗 Usta Yolda', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    started: { label: '🔨 Devam Ediyor', cls: 'bg-orange-50 text-orange-700 border-orange-100' },
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex w-full overflow-x-hidden">
      
      {/* SOL MENÜ - Bilgisayarda Sabit */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col p-6 gap-8 fixed h-full z-40">
        <div className="text-2xl font-black text-blue-600 tracking-tighter italic">GELSİN.app</div>
        <nav className="flex flex-col gap-2 font-bold">
          <Link href="/customer" className="flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-2xl">🏠 Ana Sayfa</Link>
          <Link href="/customer/jobs" className="flex items-center gap-3 p-4 text-slate-500 hover:bg-slate-50 rounded-2xl">📋 İşlerim</Link>
          <Link href="/customer/messages" className="flex items-center gap-3 p-4 text-slate-500 hover:bg-slate-50 rounded-2xl">💬 Mesajlar</Link>
          <Link href="/customer/profile" className="flex items-center gap-3 p-4 text-slate-500 hover:bg-slate-50 rounded-2xl">👤 Profilim</Link>
        </nav>
      </aside>

      {/* ANA İÇERİK - Kenardaki boşlukları öldürmek için w-full ve lg:pl-72 */}
      <main className="flex-1 w-full lg:pl-72">
        
        {/* ÜST BAR - Tam genişlik */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 w-full">
          <div className="lg:hidden text-2xl font-black text-blue-600 italic">G.</div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                {userName?.charAt(0) || 'K'}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 leading-none">{userName || 'Kullanıcı'}</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase mt-1 tracking-wider italic">Ev Sahibi</p>
              </div>
            </div>
          </div>
        </header>

        {/* İÇERİK ALANI - Boşlukları buradaki max-w-full ve px değerleriyle bitiriyoruz */}
        <div className="p-4 lg:p-10 w-full max-w-full">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* SOL TARAF - Akış */}
            <div className="xl:col-span-8 space-y-8">
              <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 lg:p-12 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-3 italic">Selam, {userName?.split(' ')[0] || 'Hoşgeldin'}!</h2>
                  <p className="text-blue-100 text-lg opacity-90 mb-8">Evin için bir usta mı lazım? Hemen talebini oluştur.</p>
                  <Link href="/customer/new-job" className="bg-white text-blue-600 px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-transform inline-block">
                    🚀 Yeni İş Talebi Oluştur
                  </Link>
                </div>
                <div className="absolute right-[-30px] bottom-[-30px] text-[200px] opacity-10 rotate-12 select-none pointer-events-none">🏠</div>
              </section>

              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 italic font-black">
                {[{i:'🔧',l:'Tamir'},{i:'🧹',l:'Temizlik'},{i:'🏠',l:'Yıkama'},{i:'🚰',l:'Tesisat'}].map(cat=>(
                  <button key={cat.l} className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-blue-500 transition-all shadow-sm group">
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{cat.i}</div>
                    <div className="text-slate-800 tracking-tighter">{cat.l}</div>
                  </button>
                ))}
              </section>
            </div>

            {/* SAĞ TARAF - Harita ve Durum */}
            <div className="xl:col-span-4 space-y-8">
               <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black mb-4 italic">📍 Çevrendeki Ustalar</h3>
                  <div className="h-80 rounded-[2rem] overflow-hidden border-2 border-slate-100">
                    <ProviderMap providers={providers} />
                  </div>
               </div>
            </div>

          </div>
        </div>
      </main>

      {/* REZALET FİX: MOBİL ALT MENÜ - SADECE MOBİLDE GÖRÜNÜR (hidden lg:flex) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-8 py-4 flex justify-between items-center z-50 rounded-t-[2rem] shadow-2xl">
        <Link href="/customer" className="text-blue-600 text-3xl">🏠</Link>
        <Link href="/customer/jobs" className="text-slate-300 text-3xl">📋</Link>
        <Link href="/customer/new-job" className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg -mt-12 border-4 border-white">＋</Link>
        <Link href="/customer/messages" className="text-slate-300 text-3xl">💬</Link>
        <Link href="/customer/profile" className="text-slate-300 text-3xl">👤</Link>
      </nav>
    </div>
  )
}