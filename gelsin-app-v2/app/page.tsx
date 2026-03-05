'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Search,
  ArrowRight,
  Paintbrush,
  Droplets,
  Zap,
  Hammer,
  Sparkles,
  Wrench,
  ChevronRight,
  BadgeCheck,
  FileText,
  Wallet,
  Lock,
} from 'lucide-react'
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
  { icon: Paintbrush, label: 'Boya & Badana', slug: 'painting', color: 'bg-blue-50 text-blue-600' },
  { icon: Droplets, label: 'Su Tesisatı', slug: 'plumbing', color: 'bg-cyan-50 text-cyan-600' },
  { icon: Zap, label: 'Elektrik', slug: 'electric', color: 'bg-amber-50 text-amber-600' },
  { icon: Hammer, label: 'Marangoz', slug: 'carpentry', color: 'bg-orange-50 text-orange-600' },
  { icon: Sparkles, label: 'Temizlik', slug: 'cleaning', color: 'bg-emerald-50 text-emerald-600' },
  { icon: Wrench, label: 'Montaj', slug: 'assembly', color: 'bg-slate-100 text-slate-600' },
]

const HOW_IT_WORKS = [
  { step: 1, title: 'İşini Anlat', desc: 'İhtiyacını kısaca yaz, konumunu seç.', icon: FileText },
  { step: 2, title: 'Teklif Al', desc: 'Onaylı ustalardan anında fiyat teklifleri al.', icon: Wallet },
  { step: 3, title: 'Güvenle Öde', desc: 'İş bitene kadar ödemen güvende, sonra onayla.', icon: Lock },
]

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

function StarRating({ value }: { value: number }) {
  const v = Math.min(5, Math.max(0, value))
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= v ? 'text-amber-400' : 'text-slate-200'}
          style={{ color: i <= v ? undefined : undefined }}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </span>
      ))}
    </div>
  )
}

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
            <Link href="/login" className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm">
              Giriş Yap
            </Link>
            <Link href="/register" className="px-5 py-2.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all text-sm">
              Kayıt Ol
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero - grid + radial glow, vurgulu başlık */}
      <section className="relative hero-bg pt-32 pb-24 sm:pt-40 sm:pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(59,130,246,0.07),transparent_50%)]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_40%_at_85%_10%,rgba(148,163,184,0.06),transparent_45%)]" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.15] mb-5"
          >
            <span className="text-slate-900">Aradığın ustayı </span>
            <span className="bg-gradient-to-r from-orange-500 to-indigo-600 bg-clip-text text-transparent font-extrabold">
              hemen bul
            </span>
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

      {/* Categories - Lucide ikonlar, renkli yuvarlak, hover lift */}
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
            {CATEGORIES.map((c) => {
              const Icon = c.icon
              return (
                <motion.div key={c.slug} variants={itemUp} className="flex">
                  <Link
                    href={`/providers?category=${c.slug}`}
                    className="flex-1 w-36 min-w-[140px] py-6 px-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-slate-200 transition-all duration-200 active:scale-[0.98] text-center group"
                  >
                    <div className={`inline-flex p-3 rounded-full ${c.color} mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <span className="whitespace-nowrap text-center text-sm md:text-base font-bold text-slate-800">
                      {c.label}
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* How it works - Lucide ikonlar */}
      <section className="py-20 px-4 bg-white border-y border-slate-200/80">
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
            className="grid sm:grid-cols-3 gap-8"
          >
            {HOW_IT_WORKS.map((h) => {
              const Icon = h.icon
              return (
                <motion.div key={h.step} variants={itemUp} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-700 mx-auto mb-5">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="text-slate-800 font-bold text-sm mb-1">Adım {h.step}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{h.title}</h3>
                  <p className="text-slate-500 text-base">{h.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Usta kartları - avatar, Onaylı rozet, 5 yıldız, Profili İncele */}
      {providers.length > 0 && (
        <section className="py-20 px-4">
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
              {providers.slice(0, 6).map((p) => {
                const name = p.profiles?.full_name || 'Usta'
                const initial = name[0]?.toUpperCase() || 'U'
                const rating = typeof p.rating === 'number' ? p.rating : 0
                const reviews = p.total_reviews ?? 0
                return (
                  <motion.div key={p.id} variants={itemUp}>
                    <Link
                      href="/providers"
                      className="flex flex-col gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-200 transition-all duration-200 active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-800 shrink-0 ring-2 ring-white ring-offset-2 shadow-sm">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 truncate">{name}</p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold shrink-0">
                              <BadgeCheck className="w-3.5 h-3.5" />
                              Onaylı Usta
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <StarRating value={rating} />
                            <span className="text-xs text-slate-500">({reviews} iş)</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400">Profesyonel hizmet</span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-white group-hover:bg-slate-800 transition-colors">
                          Hemen Teklif İste
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
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

      {/* CTA - koyu kutu, beyaz yazı, belirgin butonlar */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-3xl bg-slate-900 px-8 sm:px-12 py-14 sm:py-16 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Hemen başla</h2>
          <p className="text-slate-300 text-lg mb-10 max-w-xl mx-auto">
            Ücretsiz kayıt ol, işini aç veya usta olarak katıl.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-slate-900 bg-white hover:bg-slate-100 active:scale-[0.98] transition-all text-base shadow-lg"
            >
              Kayıt Ol <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 active:scale-[0.98] transition-all text-base"
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
