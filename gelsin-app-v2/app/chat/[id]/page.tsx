'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Message = {
  id: string
  job_id: string
  sender_id: string
  body: string
  created_at: string
}

export default function JobChatPage() {
  const { id } = useParams()
  const router = useRouter()
  const [job, setJob] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  const supabase = createClient()

  const loadJobAndUser = async () => {
    const [{ data: authData }, { data: j }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('jobs')
        .select(
          'id, title, customer_id, provider_id, service_categories(name, icon)'
        )
        .eq('id', id)
        .single(),
    ])

    setUserId(authData.user?.id ?? null)
    setJob(j)
  }

  const loadMessages = async () => {
    if (!id) return
    const { data } = await supabase
      .from('messages')
      .select('id, job_id, sender_id, body, created_at')
      .eq('job_id', id)
      .order('created_at', { ascending: true })

    setMessages((data || []) as Message[])
  }

  useEffect(() => {
    loadJobAndUser().then(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!userId) return
    loadMessages()
    const interval = setInterval(loadMessages, 4000)
    return () => clearInterval(interval)
  }, [userId, id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return
      setIsDesktop(window.innerWidth >= 1024)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sendMessage = async () => {
    if (!text.trim() || !job || !userId) return
    const receiverId =
      userId === job.customer_id ? job.provider_id : job.customer_id

    if (!receiverId) {
      alert('Bu iş için karşı taraf bulunamadı.')
      return
    }

    const body = text.trim()
    setText('')

    const { error } = await supabase.from('messages').insert({
      job_id: id,
      sender_id: userId,
      receiver_id: receiverId,
      body,
    })

    if (error) {
      console.error('MESAJ INSERT HATASI:', error)
      alert('Mesaj gönderilemedi: ' + error.message)
      return
    }

    // Karşı tarafa bildirim gönder
    try {
      const isCustomerSender = job.customer_id === userId
      const preview =
        body.length > 80 ? body.slice(0, 77).trimEnd() + '...' : body

      await supabase.from('notifications').insert({
        user_id: receiverId,
        title: isCustomerSender ? 'Müşteriden Yeni Mesaj' : 'Ustadan Yeni Mesaj',
        body: `"${job.title}" işi için yeni mesaj: ${preview}`,
        type: 'chat_message',
        related_job_id: id,
      })
    } catch (e) {
      console.error('MESAJ BILDIRIM HATASI:', e)
    }

    await loadMessages()
  }

  if (loading || !job || !userId) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isCustomer = userId === job.customer_id

  // DESKTOP: sağ altta küçük chat penceresi (overlay)
  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-[120] pointer-events-none flex items-end justify-end pr-4 pb-4 bg-transparent">
        <div className="pointer-events-auto flex flex-col w-full max-w-sm h-[420px] max-h-[70vh] bg-slate-50 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-slate-400 text-sm font-semibold"
            >
              ✕
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg">
                {job.service_categories?.icon || '💬'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 line-clamp-1">
                  {job.title}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isCustomer ? 'Usta ile sohbet' : 'Müşteri ile sohbet'}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 py-3 overflow-y-auto space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-xs text-slate-400 mt-4">
                Henüz mesaj yok. İlk mesajı siz gönderebilirsiniz.
              </div>
            )}
            {messages.map((m) => {
              const isMine = m.sender_id === userId
              return (
                <div
                  key={m.id}
                  className={`flex w-full ${
                    isMine ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                    <p className="text-[10px] opacity-70 mt-1 text-right">
                      {new Date(m.created_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </main>

          <footer className="border-t border-slate-200 bg-white px-3 py-2 flex items-center gap-2">
            <textarea
              className="flex-1 min-h-[40px] max-h-[80px] text-sm border border-slate-200 rounded-2xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              rows={1}
              placeholder="Mesaj yazın..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-2 text-sm font-bold disabled:opacity-50"
              onClick={sendMessage}
              disabled={!text.trim()}
            >
              Gönder
            </button>
          </footer>
        </div>
      </div>
    )
  }

  // MOBİL: tam ekran sohbet
  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      <header className="px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-3 sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="text-blue-600 text-sm font-semibold"
        >
          ← Geri
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg">
            {job.service_categories?.icon || '💬'}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 line-clamp-1">
              {job.title}
            </p>
            <p className="text-[11px] text-slate-400">
              {isCustomer ? 'Usta ile sohbet' : 'Müşteri ile sohbet'}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-3 overflow-y-auto space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-xs text-slate-400 mt-10">
            Henüz mesaj yok. İlk mesajı siz gönderebilirsiniz.
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === userId
          return (
            <div
              key={m.id}
              className={`flex w-full ${
                isMine ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMine
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className="text-[10px] opacity-70 mt-1 text-right">
                  {new Date(m.created_at).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      <footer className="border-t border-slate-200 bg-white px-3 py-2 flex items-center gap-2">
        <textarea
          className="flex-1 min-h-[40px] max-h-[96px] text-sm border border-slate-200 rounded-2xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          rows={1}
          placeholder="Mesaj yazın..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-2 text-sm font-bold disabled:opacity-50"
          onClick={sendMessage}
          disabled={!text.trim()}
        >
          Gönder
        </button>
      </footer>
    </div>
  )
}

