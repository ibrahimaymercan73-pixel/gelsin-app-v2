'use client'

import { motion } from 'framer-motion'
import { Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16 px-4">
      <div className="absolute inset-0 bg-surface-warm" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-3xl translate-y-1/2 -translate-x-1/3" />
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            Türkiye&apos;nin yeni nesil hizmet platformu
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 text-slate-900">
            Aradığın uzmanı <span className="text-gradient">hemen bul</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10">
            Özel ders, yol yardımı, kuaför, tamir ve temizlik. İhtiyacın olan tüm uzmanlar tek tıkla kapında.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-2xl mx-auto mb-6">
          <Link href="/customer/new-job" className="flex items-center gap-3 w-full bg-white rounded-2xl shadow-card border border-slate-200 p-3 hover:shadow-card-hover transition-all">
            <Search className="h-5 w-5 text-slate-400 shrink-0" />
            <span className="flex-1 text-left text-slate-400">Hangi uzmana ihtiyacın var?</span>
            <span className="font-bold text-slate-800 text-sm">İş Aç</span>
            <ArrowRight className="h-4 w-4 text-slate-500" />
          </Link>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-sm text-slate-500 mb-12">
          Kayıt gerekmez. Önce uzmanları incele, sonra giriş yap.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-3 sm:gap-4"
        >
          <a
            href="/cekici"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-full font-semibold"
          >
            🚛 Çekici Hizmeti
          </a>

          <a
            href="/sofor"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full font-semibold"
          >
            👨‍✈️ Özel Şoför
          </a>
        </motion.div>
      </div>
    </section>
  )
}
