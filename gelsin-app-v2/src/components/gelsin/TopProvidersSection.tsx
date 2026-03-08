'use client'

import { motion } from 'framer-motion'
import { Star, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type Provider = { id: string; full_name?: string | null; rating?: number | null; total_reviews?: number | null }

const fallback: Provider[] = [
  { id: '1', full_name: 'Ahmet Y.', rating: 4.9, total_reviews: 87 },
  { id: '2', full_name: 'Elif D.', rating: 5.0, total_reviews: 124 },
  { id: '3', full_name: 'Mehmet K.', rating: 4.8, total_reviews: 56 },
  { id: '4', full_name: 'Zeynep A.', rating: 5.0, total_reviews: 203 },
]

export default function TopProvidersSection(props: { providers?: Provider[] }) {
  const providers = props.providers ?? []
  const list = providers.length >= 4 ? providers.slice(0, 4) : fallback

  return (
    <section className="py-24 px-4 sm:px-6 bg-surface-warm">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2 text-slate-900">En İyi Uzmanlar</h2>
            <p className="text-slate-500 text-lg">En cok tercih edilen profesyoneller</p>
          </div>
          <Link href="/customer/jobs" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50">
            Tumunu Gor <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {list.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center font-display font-bold text-orange-600">
                  {(p.full_name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900">{p.full_name || 'Uzman'}</h4>
                  <p className="text-xs text-slate-500">Onaylı Uzman</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-3">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-600">Onaylı Uzman</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                  <span className="text-sm font-bold">{p.rating ?? 4.9}</span>
                </div>
                <span className="text-xs text-slate-500">{p.total_reviews ?? 50} tamamlanan iş</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
