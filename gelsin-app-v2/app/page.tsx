'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getCurrentUserAndRole } from '@/lib/auth'

const SEARCH_PLACEHOLDERS = [
  'Musluk tamiri',
  'Boya badana',
  'Su tesisatı',
  'Ev temizliği',
  'Elektrik arızaları',
  'Montaj işleri',
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
    }, 2800)
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200/80"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900 tracking-tight">
            GELSİN<span className="text-slate-800">.</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all text-sm"
            >
              Kayıt Ol
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.15] mb-5"
          >
            Aradığın ustayı hemen bul
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4 }}
            className="text-lg sm:text-xl text-slate-500 mb-12 max-w-2xl mx-auto font-medium"
          >
            Tamir, temizlik, boya, tesisat… Güvenilir ustalardan anında teklif al.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <Link
              href="/providers"
              className="flex items-center justify-center gap-3 w-full sm:min-w-[480px] mx-auto h-16 sm:h-[4.25rem] px-6 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 hover:shadow-xl hover:border-slate-300 focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all text-left"
            >
              <Search className="w-6 h-6 text-slate-500 shrink-0" />
              <span className="text-slate-500 flex-1 text-base sm:text-lg">{searchPlaceholder}...</span>
              <span className="text-slate-800 font-bold text-sm">Ara</span>
            </Link>
            <p className="mt-4 text-sm text-slate-400">
              Kayıt gerekmez · Önce ustaları incele, sonra giriş yap
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-slate-900 mb-10 text-center"
          >
            Hizmet Kategorileri
          </motion.h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5"
          >
            {CATEGORIES.map((c) => (
              <motion.div key={c.slug} variants={itemUp}>
                <Link
                  href={`/providers?category=${c.slug}`}
                  className="block p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 active:scale-[0.98] text-center group"
                >
                  <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">{c.icon}</span>
                  <span className="text-sm font-bold text-slate-800">{c.label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-white border-y border-slate-200/80">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-slate-900 mb-14 text-center"
          >
            Nasıl Çalışır?
          </motion.h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid sm:grid-cols-3 gap-10"
          >
            {HOW_IT_WORKS.map((h) => (
              <motion.div key={h.step} variants={itemUp} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-2xl flex items-center justify-center mx-auto mb-5">
                  {h.icon}
                </div>
                <div className="text-slate-800 font-bold text-sm mb-1">Adım {h.step}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{h.title}</h3>
                <p className="text-slate-500 text-base">{h.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured providers */}
      {providers.length > 0 && (
        <section className="py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl font-bold text-slate-900 mb-10 text-center"
            >
              En İyi Ustalarımız
            </motion.h2>
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {providers.slice(0, 6).map((p) => (
                <motion.div key={p.id} variants={itemUp}>
                  <Link
                    href="/providers"
                    className="block p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-800 shrink-0">
                        {(p.profiles?.full_name || 'U')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-lg truncate">
                          {p.profiles?.full_name || 'Usta'}
                        </p>
                        <p className="text-sm text-slate-500">
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
      <section className="py-20 px-4 bg-slate-800 text-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-10 text-center"
          >
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-white">{stats.jobs > 0 ? `${stats.jobs}+` : '1000+'}</div>
              <div className="text-slate-400 text-sm font-medium mt-1">Tamamlanan İş</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-white">{stats.providers > 0 ? `${stats.providers}+` : '200+'}</div>
              <div className="text-slate-400 text-sm font-medium mt-1">Onaylı Usta</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-white">500+</div>
              <div className="text-slate-400 text-sm font-medium mt-1">Mutlu Müşteri</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Hemen başla</h2>
          <p className="text-slate-500 text-lg mb-8">Ücretsiz kayıt ol, işini aç veya usta olarak katıl.</p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all text-base"
            >
              Kayıt Ol <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all text-base"
            >
              Giriş Yap
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="py-10 px-4 border-t border-slate-200 bg-white text-center text-sm text-slate-500">
        GELSİN<span className="text-slate-800 font-semibold">.</span> — Kapınıza kadar hizmet
      </footer>
    </div>
  )
}
