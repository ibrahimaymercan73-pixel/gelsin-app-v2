'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ProviderMap = dynamic(() => import('@/components/ProviderMap'), { ssr: false })

export default function CustomerHome() {
  const [userName, setUserName] = useState('')
  const [providers, setProviders] = useState<any[]>([])

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
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#F4F7FA]">

      {/* HEADER */}
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Müşteri Paneli</p>
          <h1 className="text-xl font-black text-slate-800 mt-0.5">Ana Sayfa</h1>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
            {userName?.charAt(0)?.toUpperCase() || 'K'}
          </div>
          <span className="text-sm font-bold text-slate-800 hidden sm:block">{userName || 'Kullanıcı'}</span>
        </div>
      </header>

      {/* İÇERİK */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <div className="flex flex-col xl:flex-row gap-8">

          {/* SOL */}
          <div className="flex-1 space-y-8">
            {/* Hero Kart */}
            <section className="bg-slate-900 rounded-[2.5rem] p-10 lg:p-14 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 max-w-md">
                <h2 className="text-4xl lg:text-5xl font-black mb-4 leading-[1.1] tracking-tight">
                  Eviniz için en iyi ustalar burada.
                </h2>
                <p className="text-slate-400 text-lg mb-8 font-medium">
                  Hemen bir iş ilanı açın, teklifleri toplayın.
                </p>
                <Link href="/customer/new-job"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all inline-block shadow-lg shadow-blue-600/30">
                  Yeni İş Talebi Oluştur 🚀
                </Link>
              </div>
              <div className="absolute right-[-40px] top-[-40px] text-[280px] opacity-5 pointer-events-none select-none">🏠</div>
            </section>

            {/* Kategoriler */}
            <section>
              <h3 className="font-bold text-slate-800 mb-4 px-1">Popüler Hizmetler</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[{i:'🔧',l:'Tamir'},{i:'🧹',l:'Temizlik'},{i:'⚡',l:'Elektrik'},{i:'🚰',l:'Tesisat'}].map(c => (
                  <div key={c.l} className="bg-white p-6 rounded-3xl border border-slate-200/60 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group text-center">
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{c.i}</div>
                    <div className="font-bold text-slate-700 text-sm uppercase tracking-wider">{c.l}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SAĞ - Harita */}
          <div className="w-full xl:w-[380px] shrink-0">
            <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200/60 shadow-sm sticky top-32">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">📍 Çevrendeki Ustalar</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse block"></span>
              </div>
              <div className="h-[420px] rounded-[2rem] overflow-hidden bg-slate-100 shadow-inner">
                <ProviderMap providers={providers} />
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                <p className="text-xs text-blue-700 font-bold">
                  Şu an bölgenizde {providers.length} aktif usta bulunuyor.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
