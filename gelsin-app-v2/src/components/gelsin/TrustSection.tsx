'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, CreditCard, UserCheck, Star, Lock, Headphones } from 'lucide-react'

const features = [
  { icon: UserCheck, title: 'Kimlik Doğrulama', desc: 'Tüm uzmanlar kimlik kontrolünden geçirilir ve onaylanır.' },
  { icon: CreditCard, title: 'Güvenli Ödeme', desc: 'Ödemen iş tamamlanana kadar emanette tutulur.' },
  { icon: Star, title: 'Değerlendirme Sistemi', desc: 'Gerçek müşteri yorumlarıyla uzman kalitesini gör.' },
  { icon: Lock, title: 'Veri Güvenliği', desc: 'Kişisel bilgilerin şifrelenerek korunur.' },
  { icon: ShieldCheck, title: 'İş Garantisi', desc: 'Memnun kalmazsan destek ekibimiz devreye girer.' },
  { icon: Headphones, title: '7/24 Destek', desc: 'Herhangi bir sorun için canlı destek hattımız aktif.' },
]

export default function TrustSection() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-slate-900">Neden Güvenli?</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">Baştan sona güvenli bir deneyim için her detayı düşündük</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-card">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <f.icon className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h4 className="font-display font-bold mb-1 text-slate-900">{f.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
