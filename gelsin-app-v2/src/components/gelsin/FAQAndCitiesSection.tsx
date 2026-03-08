'use client'

import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya', 'Mersin', 'Kayseri', 'Eskişehir', 'Trabzon']

const faqs = [
  { q: 'GELSİN nasıl çalışır?', a: 'İhtiyacınızı belirtin, onaylı uzmanlardan teklif alın. Ödemeniz iş tamamlanana kadar emanette tutulur.' },
  { q: 'Ödeme nasıl yapılır?', a: 'Kredi kartı veya banka kartıyla güvenli ödeme. Ödemeniz işi onaylayana kadar güvende tutulur.' },
  { q: 'Uzman nasıl olunur?', a: 'Ücretsiz kayıt olun, kimlik doğrulamasını tamamlayın, hizmet kategorinizi seçin.' },
  { q: 'İşi beğenmezsem ne olur?', a: 'Destek ekibimiz devreye girer. İade veya yeniden hizmet seçenekleri sunulur.' },
  { q: 'Platform ücretsiz mi?', a: 'Müşteriler için ücretsiz. Uzmanlar kabul ettikleri işlerden küçük komisyon öder.' },
]

export default function FAQAndCitiesSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  return (
    <section className="py-24 px-4 sm:px-6 bg-surface-cool">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl font-bold mb-2 text-slate-900">SSS</h2>
            <p className="text-slate-500 mb-8">Merak ettiklerin burada</p>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full px-5 py-4 text-left font-display font-semibold text-slate-900 flex justify-between">
                    {f.q}
                    <span className="text-slate-400">{openIndex === i ? '-' : '+'}</span>
                  </button>
                  {openIndex === i && <div className="px-5 pb-4 text-slate-500 text-sm">{f.a}</div>}
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl font-bold mb-2 text-slate-900">Şehirler</h2>
            <p className="text-slate-500 mb-8">Türkiye genelinde hizmet</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cities.map((city) => (
                <Link key={city} href="/customer/new-job" className="flex items-center gap-2 p-4 rounded-xl bg-white border border-slate-200 shadow-card hover:shadow-card-hover group">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm text-slate-700 group-hover:text-orange-600">{city}</span>
                </Link>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-6 text-center">ve 50+ şehir</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
