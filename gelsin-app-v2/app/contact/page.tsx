'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const preload = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.full_name) {
        setName(profile.full_name)
      }
    }
    preload()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !subject.trim()) {
      toast.error('Lütfen konu ve mesaj alanlarını doldurun.')
      return
    }
    setSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Lütfen giriş yaparak iletişim formunu kullanın.')
        return
      }

      const title = `[İLETİŞİM FORMU] ${subject.trim()}`
      const fullMessage =
        `Ad Soyad: ${name || '-'}\n` +
        `E-posta: ${email || '-'}\n\n` +
        `${message.trim()}`

      const { error } = await supabase.from('support_tickets').insert({
        customer_id: user.id,
        provider_id: null,
        category: 'feedback',
        title,
        message: fullMessage,
        status: 'pending',
      })

      if (error) {
        toast.error('Mesajınız iletilirken bir hata oluştu: ' + error.message)
        return
      }

      toast.success('Mesajınız iletildi, destek ekibimiz en kısa sürede size ulaşacak.')
      setSubject('')
      setMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 pt-28 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
            İletişim Formu
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            Her türlü soru, öneri veya şikayetiniz için formu doldurabilirsiniz. Destek ekibimiz
            en kısa sürede size dönüş yapacaktır.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Adınızı yazın"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  E-posta
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="ornek@mail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Konu
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Konu başlığınız"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Mesajınız
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[140px]"
                placeholder="Sorunuzu veya talebinizi detaylıca yazın..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 shadow-md"
            >
              {submitting ? 'Gönderiliyor...' : 'Mesajı Gönder'}
            </button>
          </form>
        </section>

        <aside className="bg-slate-900 text-slate-100 rounded-3xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold">İletişim Bilgileri</h2>
          <p className="text-sm text-slate-300">
            Aşağıdaki kanallardan bize her zaman ulaşabilirsiniz. PayTR denetimi için gerekli tüm
            ticari bilgiler burada yer almaktadır.
          </p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">Adres</p>
              <p className="text-slate-300">
                Belediye Caddesi 35/C<br />
                Pursaklar / ANKARA
              </p>
            </div>
            <div>
              <p className="font-semibold">Telefon</p>
              <p className="text-slate-300">
                <a href="tel:03128701536" className="hover:underline">
                  0312 870 15 36
                </a>
              </p>
            </div>
            <div>
              <p className="font-semibold">E-posta</p>
              <p className="text-slate-300">
                <a href="mailto:destek@gelsin.dev" className="hover:underline">
                  destek@gelsin.dev
                </a>
              </p>
            </div>
            <div>
              <p className="font-semibold">Çalışma Saatleri</p>
              <p className="text-slate-300">Her gün 09:00 - 22:00</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400 space-y-1">
            <p>Ödeme altyapısı PayTR tarafından sağlanmaktadır.</p>
            <p>Visa, Mastercard ve Troy logoları ile gösterilen kartlar kabul edilmektedir.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

