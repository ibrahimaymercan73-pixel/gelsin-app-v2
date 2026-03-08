'use client'

import { motion } from 'framer-motion'

export default function StatsSection({ stats }: { stats?: { jobs: number; providers: number } }) {
  const items = [
    { value: stats?.jobs ? `${stats.jobs}+` : '9+', label: 'Tamamlanan İş' },
    { value: stats?.providers ? `${stats.providers}+` : '4+', label: 'Onaylı Uzman' },
    { value: '30+', label: 'Mutlu Müşteri' },
    { value: '5.0', label: 'Ortalama Puan' },
  ]
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {items.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="font-display text-4xl sm:text-5xl font-extrabold text-gradient mb-2">{stat.value}</div>
              <div className="text-slate-500 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
