'use client'

import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const cities = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya', 'Mersin', 'Kayseri', 'Eskisehir', 'Trabzon']

const faqs = [
  { q: 'GELSIN nasil calisir?', a: 'Ihtiyacinizi belirtin, onayli uzmanlardan teklif alin. Odemeniz is tamamlanana kadar emanette tutulur.' },
  { q: 'Odeme nasil yapilir?', a: 'Kredi karti veya banka kartiyla guvenli odeme. Odemeniz isi onaylayana kadar guvende tutulur.' },
  { q: 'Uzman nasil olunur?', a: 'Ucretsiz kayit olun, kimlik dogrulamasini tamamlayin, hizmet kategorinizi secin.' },
  { q: 'Isi begendinmezsem ne olur?', a: 'Destek ekibimiz devreye girer. Iade veya yeniden hizmet secenekleri sunulur.' },
  { q: 'Platform ucretsiz mi?', a: 'Musteriler icin ucretsiz. Uzmanlar kabul ettikleri islerden kucuk komisyon oder.' },
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
            <h2 className="font-display text-3xl font-bold mb-2 text-slate-900">Sehirler</h2>
            <p className="text-slate-500 mb-8">Turkiye genelinde hizmet</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cities.map((city) => (
                <Link key={city} href="/customer/new-job" className="flex items-center gap-2 p-4 rounded-xl bg-white border border-slate-200 shadow-card hover:shadow-card-hover group">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm text-slate-700 group-hover:text-orange-600">{city}</span>
                </Link>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-6 text-center">ve 50+ sehir</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
