'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Briefcase, UserPlus } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center bg-hero-gradient">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
              Hemen Başla
            </h2>
            <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">
              Ücretsiz kayıt ol, isini ac veya uzman olarak katil. Binlerce kisi seni bekliyor.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/customer/new-job" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-orange-600 bg-white hover:bg-slate-100 transition-colors">
                <Briefcase className="h-5 w-5" />
                İş Aç
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/register?role=provider" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold border-2 border-white/30 text-white hover:bg-white/10 transition-colors">
                <UserPlus className="h-5 w-5" />
                Uzman Ol
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
