'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { SERVICE_CATEGORIES } from '@/lib/constants'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

const CAT_COLORS: Record<string, string> = {
  ev_yasam: '24 95% 53%',
  arac_yol: '210 80% 50%',
  guzellik: '340 82% 52%',
  egitim: '262 83% 58%',
  evcil_hayvan: '152 69% 40%',
  teknoloji: '200 80% 50%',
  kurumsal: '220 25% 30%',
  bahce_peyzaj: '142 71% 35%',
}

export default function CategoriesSection() {
  return (
    <section id="kategoriler" className="py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-slate-900">
            Tüm Hizmet Kategorileri
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            İhtiyacınıza uygun kategoriyi seçin, hemen iş talebi oluşturun
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 justify-items-stretch"
        >
          {SERVICE_CATEGORIES.map((cat) => {
            const color = CAT_COLORS[cat.id] || '24 95% 53%'
            return (
              <motion.div key={cat.id} variants={item}>
                <Link
                  href={`/customer/new-job?cat=${cat.id}`}
                  className="group flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer block"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `hsl(${color} / 0.1)` }}
                  >
                    <cat.icon className="h-6 w-6" style={{ color: `hsl(${color})` }} />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1 text-slate-900">{cat.name}</h3>
                  <p className="text-sm text-slate-500">{cat.sub.slice(0, 2).join(', ')}</p>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
