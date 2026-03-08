'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { HelpCircle, Send, MessageSquare } from 'lucide-react'

const CATEGORIES = [
  { value: 'service', label: 'Aldığım Bir Hizmetle İlgili' },
  { value: 'payment', label: 'Ödeme ve Fatura' },
  { value: 'account', label: 'Hesap İşlemleri' },
  { value: 'feedback', label: 'Şikayet/Öneri' },
]

type JobOption = { id: string; label: string }

type TicketCard = {
  id: string
  title: string
  status: 'pending' | 'resolved'
  statusLabel: string
  date: string
}

const DUMMY_TICKETS: TicketCard[] = [
  { id: '1', title: 'Kombi Bakımı - Usta Gecikmesi', status: 'pending', statusLabel: 'İnceleniyor', date: 'Bugün, 14:30' },
  { id: '2', title: 'Fatura Talebi', status: 'resolved', statusLabel: 'Çözüldü', date: 'Dün' },
]

export default function CustomerSupportPage() {
  const [userName, setUserName] = useState('')
  const [jobs, setJobs] = useState<JobOption[]>([{ id: '', label: 'Seçiniz...' }])
  const [category, setCategory] = useState('')
  const [relatedJobId, setRelatedJobId] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tickets, setTickets] = useState<TicketCard[]>(DUMMY_TICKETS)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(p?.full_name?.trim() || '')

      const { data: jobsRows } = await supabase
        .from('jobs')
        .select('id, title, provider_id, created_at')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!jobsRows?.length) return
      const providerIds = Array.from(new Set(jobsRows.map((j: { provider_id?: string }) => j.provider_id).filter(Boolean)))
      const nameBy: Record<string, string> = {}
      if (providerIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles_public').select('id, full_name').in('id', providerIds)
        for (const x of profiles || []) nameBy[x.id] = x.full_name || 'Uzman'
      }
      const options: JobOption[] = [
        { id: '', label: 'Seçiniz...' },
        ...jobsRows.map((j: { id: string; title: string; provider_id?: string; created_at: string }) => {
          const d = new Date(j.created_at)
          const dateStr = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          const providerName = j.provider_id ? nameBy[j.provider_id] || 'Uzman' : '—'
          return { id: j.id, label: `${j.title} (${providerName} - ${dateStr})` }
        }),
      ]
      setJobs(options)
    }
    load()
  }, [])

  const displayName = userName.trim() ? userName.trim().split(/\s+/)[0] : 'Helen'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 600))
    const catLabel = CATEGORIES.find((c) => c.value === category)?.label || category || 'Genel'
    setTickets((prev) => [
      {
        id: Date.now().toString(),
        title: catLabel,
        status: 'pending',
        statusLabel: 'Yanıt Bekliyor',
        date: 'Az önce',
      },
      ...prev,
    ])
    setCategory('')
    setRelatedJobId('')
    setMessage('')
    setSubmitting(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 flex flex-col gap-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <HelpCircle className="w-10 h-10 text-blue-600" />
          Destek Merkezi
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Sana nasıl yardımcı olabiliriz {displayName}?</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: Yeni Talep Formu (2 birim) */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm rounded-[2rem] p-8 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-500" />
              Yeni Destek Talebi
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
                  Kategori Seçimi
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Seçiniz...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="relatedJob" className="block text-sm font-semibold text-slate-700 mb-2">
                  İlgili Hizmeti Seç
                </label>
                <select
                  id="relatedJob"
                  value={relatedJobId}
                  onChange={(e) => setRelatedJobId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  {jobs.map((j) => (
                    <option key={j.id || 'empty'} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
                  Mesajınız
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Sorunuzu veya talebinizi detaylıca yazın..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y min-h-[120px]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <Send className="w-5 h-5" />
                Destek Talebi Oluştur
              </button>
            </form>
          </div>
        </div>

        {/* Sağ: Açık Taleplerim (1 birim) */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm rounded-[2rem] p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Açık Taleplerim</h2>
            <div className="flex flex-col gap-4">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-2">{t.title}</h3>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                        t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {t.statusLabel}
                    </span>
                    <span className="text-xs text-slate-500">{t.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
