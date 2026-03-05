'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, MapPin, Wrench, Star, ChevronRight, Sparkles, Paintbrush, Droplets, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const ProviderMap = dynamic(() => import('@/components/ProviderMap'), { ssr: false })

const CATEGORIES = [
  { icon: Wrench, label: 'Tamir', slug: 'repair', color: 'bg-slate-100 text-slate-700' },
  { icon: Sparkles, label: 'Temizlik', slug: 'cleaning', color: 'bg-slate-100 text-slate-700' },
  { icon: Zap, label: 'Elektrik', slug: 'repair', color: 'bg-slate-100 text-slate-700' },
  { icon: Droplets, label: 'Tesisat', slug: 'repair', color: 'bg-slate-100 text-slate-700' },
]

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const itemUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

type ProviderRow = {
  id: string
  rating: number | null
  total_reviews: number | null
  is_online: boolean | null
  profiles?: { full_name: string | null; phone: string | null } | null
}

export default function CustomerHome() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [providers, setProviders] = useState<any[]>([])
  const [featured, setFeatured] = useState<ProviderRow[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
      setUserName(p?.full_name || p?.phone || '')
      const { data: prov } = await supabase
        .from('provider_profiles')
        .select('*, profiles(full_name)')
        .eq('is_online', true)
        .eq('status', 'approved')
      setProviders(prov || [])
      const { data: feat } = await supabase
        .from('provider_profiles')
        .select('id, rating, total_reviews, is_online, profiles(full_name, phone)')
        .eq('status', 'approved')
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(6)
      setFeatured(((feat || []) as unknown) as ProviderRow[])
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Header - Glassmorphism */}
      <motion.header
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="sticky top-0 z-40 px-4 sm:px-6 lg:px-10 py-4 bg-white/70 backdrop-blur-md border-b border-stone-200/60"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Müşteri Paneli</p>
            <h1 className="text-xl font-black text-stone-900 mt-0.5">Ana Sayfa</h1>
          </div>
          <div className="flex items-center gap-3 bg-white/80 px-4 py-2.5 rounded-2xl shadow-sm border border-stone-100">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-sm text-white font-bold">
              {userName?.charAt(0)?.toUpperCase() || 'K'}
            </div>
            <span className="text-sm font-bold text-stone-800 hidden sm:block">{userName || 'Kullanıcı'}</span>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Sol - İçerik */}
          <div className="flex-1 space-y-10">
            {/* Hero kart */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 sm:p-10 lg:p-14 text-white shadow-xl border border-slate-800"
            >
              <div className="relative z-10 max-w-md">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 leading-[1.1] tracking-tight">
                  Eviniz için doğru ustayı bulun.
                </h2>
                <p className="text-slate-200 text-base sm:text-lg mb-8 font-medium">
                  Hemen bir iş ilanı açın, çevrenizdeki ustalardan teklifleri toplayın.
                </p>
                <Link
                  href="/customer/new-job"
                  className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-lg active:scale-[0.98]"
                >
                  <Sparkles className="w-5 h-5" />
                  Yeni İş Talebi Oluştur
                </Link>
              </div>
            </motion.section>

            {/* Kategoriler */}
            <motion.section
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-5"
            >
              <h3 className="font-bold text-stone-900 text-lg px-0.5">Popüler Hizmetler</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {CATEGORIES.map((c, i) => {
                  const Icon = c.icon
                  return (
                    <motion.div key={c.label} variants={itemUp}>
                      <button
                        type="button"
                        onClick={() => router.push(`/customer/providers?category=${c.slug}`)}
                        className="w-full p-5 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-200 text-left flex flex-col gap-2 active:scale-[0.98] group"
                      >
                        <span className={`inline-flex p-2 rounded-full ${c.color} w-min`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="font-bold text-stone-800 text-sm uppercase tracking-wider">{c.label}</span>
                        <span className="text-xs text-slate-800 font-semibold flex items-center gap-1">
                          Ustaları gör <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>

            {/* En İyi Ustalarımız */}
            {featured.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-5"
              >
                <h3 className="font-bold text-stone-900 text-lg px-0.5">En İyi Ustalarımız</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {featured.slice(0, 4).map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href="/customer/providers"
                        className="block p-4 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-lg hover:border-brand-100 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-800 shrink-0">
                            {(p.profiles?.full_name || p.profiles?.phone || 'U')[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-stone-900 truncate">
                              {p.profiles?.full_name || p.profiles?.phone || 'Usta'}
                            </p>
                            <p className="text-xs text-stone-500 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              {typeof p.rating === 'number' ? p.rating.toFixed(1) : '—'} · {(p.total_reviews ?? 0)} iş
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-stone-300 shrink-0" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* Sağ - Harita */}
          <div className="w-full xl:w-[380px] shrink-0">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              className="bg-white rounded-[2rem] p-6 border border-stone-100 shadow-sm sticky top-28"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-stone-900 text-sm uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-900" />
                  Çevrendeki Ustalar
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="h-[380px] rounded-xl overflow-hidden bg-stone-100">
                <ProviderMap providers={providers} />
              </div>
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-sm text-stone-700 font-semibold">
                  Bölgenizde <span className="text-slate-900">{providers.length}</span> aktif usta
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
