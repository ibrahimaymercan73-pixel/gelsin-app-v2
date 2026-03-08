'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  { name: 'Ayşe K.', role: 'Ev Sahibi', text: 'Tesisatçıya ihtiyacım vardı, 10 dakikada 3 teklif aldım. Fiyatlar çok uygundu.', rating: 5, avatar: 'AK' },
  { name: 'Burak T.', role: 'Öğrenci', text: 'Matematik özel ders için başvurdum, hocam harikaydı. Sınav notlarım yükseldi!', rating: 5, avatar: 'BT' },
  { name: 'Selin M.', role: 'Çalışan Anne', text: 'Eve gelen kuaför hizmeti hayat kurtarıcı. Güzellik ayağıma geliyor.', rating: 5, avatar: 'SM' },
]

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-slate-900">Kullanıcılarımız Ne Diyor?</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">Gerçek deneyimler, gerçek memnuniyet</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="relative bg-white rounded-2xl border border-slate-200 p-8 shadow-card hover:shadow-card-hover transition-all">
              <Quote className="absolute top-6 right-6 h-8 w-8 text-orange-500/10" />
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-orange-500 text-orange-500" />
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6">&quot;{t.text}&quot;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center font-display font-bold text-sm text-orange-600">{t.avatar}</div>
                <div>
                  <p className="font-display font-bold text-sm text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
