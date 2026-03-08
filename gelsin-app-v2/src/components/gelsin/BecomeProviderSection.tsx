'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Wallet, Calendar, Users, TrendingUp, ArrowRight } from 'lucide-react'

const perks = [
  { icon: Wallet, text: 'Kendi fiyatını belirle' },
  { icon: Calendar, text: 'Esnek çalışma saatleri' },
  { icon: Users, text: 'Binlerce potansiyel müşteri' },
  { icon: TrendingUp, text: 'Kazancını büyüt' },
]

export default function BecomeProviderSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-surface-warm">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="inline-block text-sm font-bold text-orange-600 tracking-wider uppercase mb-4">Uzmanlar için</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 leading-tight text-slate-900">
              Yeteneğini paraya çevir, <span className="text-gradient">müşteriler seni bulsun</span>
            </h2>
            <p className="text-slate-500 text-lg mb-8 leading-relaxed">
              GELSIN platformuna uzman olarak katıl. Profilini oluştur, gelen iş taleplerini değerlendir. Kayıt ücretsiz.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {perks.map((perk) => (
                <div key={perk.text} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <perk.icon className="h-5 w-5 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{perk.text}</span>
                </div>
              ))}
            </div>
            <Link href="/register?role=provider" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors">
              Uzman Olarak Katıl <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative max-w-sm mx-auto">
            <div className="absolute -top-4 -right-4 w-full h-full rounded-2xl bg-orange-500/5 border border-orange-500/10" />
            <div className="absolute -top-2 -right-2 w-full h-full rounded-2xl bg-orange-500/10 border border-orange-500/10" />
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-card-hover p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center font-display font-bold text-orange-600">EK</div>
                <div>
                  <h4 className="font-display font-bold text-slate-900">Emre K.</h4>
                  <p className="text-xs text-slate-500">Elektrik Ustası, İstanbul</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Bu ay kazanç</span><span className="font-bold text-orange-600">12.450 TL</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Tamamlanan iş</span><span className="font-bold">23</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Müşteri puanı</span><span className="font-bold">4.9</span></div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-orange-500 rounded-full" />
              </div>
              <p className="text-xs text-slate-500 mt-2">Aylık hedefin yüzde 85 tamamlandı</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
