'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Wrench, Sparkles, Shield, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getCurrentUserAndRole } from '@/lib/auth'

const SEARCH_PLACEHOLDERS = [
  'Boya, Badana',
  'Su Tesisatı',
  'Temizlik',
  'Elektrik',
  'Marangoz',
  'Montaj',
]

const CATEGORIES = [
  { icon: '🎨', label: 'Boya & Badana', slug: 'painting' },
  { icon: '🚰', label: 'Su Tesisatı', slug: 'plumbing' },
  { icon: '⚡', label: 'Elektrik', slug: 'electric' },
  { icon: '🪚', label: 'Marangoz', slug: 'carpentry' },
  { icon: '🧹', label: 'Temizlik', slug: 'cleaning' },
  { icon: '🔩', label: 'Montaj', slug: 'assembly' },
]

const HOW_IT_WORKS = [
  { step: 1, title: 'İşini Anlat', desc: 'İhtiyacını kısaca yaz, konumunu seç.', icon: '📝' },
  { step: 2, title: 'Teklif Al', desc: 'Onaylı ustalardan anında fiyat teklifleri al.', icon: '💰' },
  { step: 3, title: 'Güvenle Öde', desc: 'İş bitene kadar ödemen güvende, sonra onayla.', icon: '🔒' },
]

const STATS = [
  { value: '500+', label: 'Mutlu Müşteri' },
  { value: '200+', label: 'Onaylı Usta' },
  { value: '1000+', label: 'Tamamlanan İş' },
]

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

export default function LandingPage() {
  const router = useRouter()
  const [searchPlaceholder, setSearchPlaceholder] = useState(SEARCH_PLACEHOLDERS[0])
  const [providers, setProviders] = useState<Array<{ id: string; rating: number | null; total_reviews: number | null; profiles?: { full_name: string | null } | null }>>([])
  const [stats, setStats] = useState({ jobs: 0, providers: 0 })

  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % SEARCH_PLACEHOLDERS.length
      setSearchPlaceholder(SEARCH_PLACEHOLDERS[i])
    }, 2500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const check = async () => {
      const { user, role } = await getCurrentUserAndRole()
      if (!user) return
      if (!role) {
        router.replace('/role-selection')
        return
      }
      if (role === 'customer') router.replace('/customer')
      else if (role === 'provider') router.replace('/provider')
      else if (role === 'admin') router.replace('/admin')
    }
    check()
  }, [router])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: prov } = await supabase
        .from('provider_profiles')
        .select('id, rating, total_reviews, profiles(full_name)')
        .eq('status', 'approved')
        .limit(6)
      setProviders(((prov || []) as unknown) as typeof providers)
      const { count: jobsCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed')
      const { count: provCount } = await supabase.from('provider_profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved')
      setStats({ jobs: jobsCount ?? 0, providers: provCount ?? 0 })
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900">
      {/* Navbar - Glassmorphism */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 bg-white/70 backdrop-blur-md border-b border-stone-200/60"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-stone-900 tracking-tight">
            GELSİN<span className="text-brand-500">.</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25"
            >
              Kayıt Ol
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-amber-50/50" />
        <div className="absolute top-0 right-0 w-[50%] h-[80%] bg-gradient-to-l from-brand-100/40 to-transparent rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black text-stone-900 tracking-tight leading-[1.1] mb-4"
          >
            Aradığın ustayı{' '}
            <span className="text-brand-500">hemen bul</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-lg sm:text-xl text-stone-500 mb-10 max-w-2xl mx-auto"
          >
            Tamir, temizlik, boya, tesisat… Güvenilir ustalardan anında teklif al, güvenle öde.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <Link
              href="/onboarding"
              className="flex items-center justify-center gap-3 w-full sm:w-auto sm:min-w-[420px] mx-auto h-14 px-6 rounded-2xl bg-white border-2 border-stone-200 shadow-lg shadow-stone-200/50 hover:border-brand-200 hover:shadow-brand-100/50 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-all text-left"
            >
              <Search className="w-5 h-5 text-stone-400 shrink-0" />
              <span className="text-stone-400 flex-1">{searchPlaceholder}...</span>
              <span className="text-brand-600 font-semibold">Ara</span>
            </Link>
            <p className="mt-3 text-sm text-stone-400">
              Ücretsiz keşfet · Kayıt olup ilk işini aç
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-stone-900 mb-8 text-center"
          >
            Hizmet Kategorileri
          </motion.h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4"
          >
            {CATEGORIES.map((c) => (
              <motion.div key={c.slug} variants={itemUp}>
                <Link
                  href={`/onboarding`}
                  className="block p-5 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-brand-100 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] text-center group"
                >
                  <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{c.icon}</span>
                  <span className="text-sm font-semibold text-stone-700">{c.label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-stone-900 mb-12 text-center"
          >
            Nasıl Çalışır?
          </motion.h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid sm:grid-cols-3 gap-8"
          >
            {HOW_IT_WORKS.map((h) => (
              <motion.div key={h.step} variants={itemUp} className="text-center relative">
                <div className="w-14 h-14 rounded-2xl bg-brand-100 text-2xl flex items-center justify-center mx-auto mb-4">
                  {h.icon}
                </div>
                <div className="text-brand-600 font-bold text-sm mb-1">Adım {h.step}</div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">{h.title}</h3>
                <p className="text-sm text-stone-500">{h.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured providers */}
      {providers.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl font-bold text-stone-900 mb-8 text-center"
            >
              En İyi Ustalarımız
            </motion.h2>
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {providers.slice(0, 6).map((p, i) => (
                <motion.div key={p.id} variants={itemUp}>
                  <Link
                    href="/login"
                    className="block p-5 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-lg hover:border-brand-100 hover:-translate-y-1 transition-all duration-200 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-2xl shrink-0">
                        {(p.profiles?.full_name || 'U')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-stone-900 truncate">
                          {p.profiles?.full_name || 'Usta'}
                        </p>
                        <p className="text-sm text-stone-500">
                          ⭐ {typeof p.rating === 'number' ? p.rating.toFixed(1) : '—'} · {(p.total_reviews ?? 0)} iş
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-16 px-4 bg-stone-900 text-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-8 text-center"
          >
            <div>
              <div className="text-3xl sm:text-4xl font-black text-brand-400">{stats.jobs > 0 ? `${stats.jobs}+` : '1000+'}</div>
              <div className="text-stone-400 text-sm font-medium mt-1">Tamamlanan İş</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-brand-400">{stats.providers > 0 ? `${stats.providers}+` : '200+'}</div>
              <div className="text-stone-400 text-sm font-medium mt-1">Onaylı Usta</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-brand-400">500+</div>
              <div className="text-stone-400 text-sm font-medium mt-1">Mutlu Müşteri</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl font-bold text-stone-900 mb-3">Hemen başla</h2>
          <p className="text-stone-500 mb-6">Ücretsiz kayıt ol, işini aç veya usta olarak katıl.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/25 active:scale-[0.98] transition-all"
            >
              Kayıt Ol <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] transition-all"
            >
              Giriş Yap
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="py-8 px-4 border-t border-stone-200 text-center text-sm text-stone-400">
        GELSİN<span className="text-brand-500">.</span> — Kapınıza kadar hizmet
      </footer>
    </div>
  )
}
