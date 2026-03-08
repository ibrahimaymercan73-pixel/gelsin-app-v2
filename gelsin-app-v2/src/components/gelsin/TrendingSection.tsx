'use client'

import { motion } from 'framer-motion'
import { TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const trending = [
  { name: 'Çekici Hizmeti', category: 'Araç & Yol Yardım', searches: '320+ arama/hafta', hot: true },
  { name: 'Eve Gelen Kuaför', category: 'Güzellik & Bakım', searches: '280+ arama/hafta', hot: true },
  { name: 'Matematik Özel Ders', category: 'Eğitim', searches: '210+ arama/hafta', hot: false },
  { name: 'Kombi Tamiri', category: 'Ev & Yaşam', searches: '190+ arama/hafta', hot: false },
  { name: 'Telefon Ekran Değişimi', category: 'Teknoloji', searches: '150+ arama/hafta', hot: false },
  { name: 'Ev Temizliği', category: 'Ev & Yaşam', searches: '175+ arama/hafta', hot: true },
]

export default function TrendingSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-surface-cool">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-orange-600 text-sm font-semibold mb-3">
              <TrendingUp className="h-4 w-4" />
              Bu Hafta Trend
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2 text-slate-900">Popüler Hizmetler</h2>
            <p className="text-slate-500 text-lg">En çok aranan hizmetlerle hızlıca başla</p>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trending.map((row, i) => (
            <motion.div
              key={row.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link href="/customer/new-job" className="flex items-center justify-between p-5 rounded-xl bg-white border border-slate-200 shadow-card hover:shadow-card-hover transition-all group block">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-display font-bold text-slate-900">{row.name}</h4>
                    {row.hot && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">Popüler</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{row.category} · {row.searches}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
