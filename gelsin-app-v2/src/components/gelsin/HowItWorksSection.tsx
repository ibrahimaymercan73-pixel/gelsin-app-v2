'use client'

import { motion } from 'framer-motion'
import { PenLine, MessageSquare, ShieldCheck } from 'lucide-react'

const steps = [
  { icon: PenLine, step: '01', title: 'İşini Anlat', desc: 'İhtiyacını kısaca yaz, konumunu seç. 30 saniyede iş talebi oluştur.' },
  { icon: MessageSquare, step: '02', title: 'Teklif Al', desc: 'Onaylı uzmanlardan anında fiyat teklifleri al, karşılaştır.' },
  { icon: ShieldCheck, step: '03', title: 'Güvenle Öde', desc: 'İş bitene kadar ödemen güvende. Memnun kalınca onayla.' },
]

export default function HowItWorksSection() {
  return (
    <section id="nasil-calisir" className="py-24 px-4 sm:px-6 bg-surface-cool">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-slate-900">Nasıl Çalışır?</h2>
          <p className="text-slate-500 text-lg">3 kolay adımda ihtiyacını karşıla</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px bg-slate-200" />
          {steps.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="relative text-center">
              <div className="relative z-10 w-16 h-16 mx-auto mb-6 rounded-2xl bg-orange-500 flex items-center justify-center shadow-card-hover">
                <s.icon className="h-7 w-7 text-white" />
              </div>
              <span className="text-xs font-bold text-orange-600 tracking-widest uppercase mb-2 block">Adım {s.step}</span>
              <h3 className="font-display text-xl font-bold mb-3 text-slate-900">{s.title}</h3>
              <p className="text-slate-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
