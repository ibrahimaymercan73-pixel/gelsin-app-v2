'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useChatOverlay } from '@/components/ChatOverlay'
import { MessageCircle } from 'lucide-react'

type Conversation = {
  job_id: string
  job_title: string
  other_name: string
  last_body: string
  last_at: string
  unread_count: number
}

export default function CustomerMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { openChat } = useChatOverlay()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setConversations([])
        setLoading(false)
        return
      }
      const me = user.id

      const { data: msgData } = await supabase
        .from('messages')
        .select('id, job_id, sender_id, receiver_id, body, created_at, is_read')
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
        .order('created_at', { ascending: false })

      const byJob: Record<string, { last: any; unreadCount: number }> = {}
      if (msgData) {
        for (const m of msgData) {
          if (!byJob[m.job_id]) byJob[m.job_id] = { last: m, unreadCount: 0 }
          if (m.receiver_id === me && (m.is_read === false || m.is_read == null)) {
            byJob[m.job_id].unreadCount += 1
          }
        }
      }

      const jobIds = Object.keys(byJob)
      if (jobIds.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, customer_id, provider_id')
        .in('id', jobIds)

      const otherIds = new Set<string>()
      if (jobs) {
        for (const j of jobs) {
          const otherId = j.customer_id === me ? j.provider_id : j.customer_id
          if (otherId) otherIds.add(otherId)
        }
      }

      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name')
        .in('id', Array.from(otherIds))

      const nameBy: Record<string, string> = {}
      if (profiles) for (const p of profiles) nameBy[p.id] = p.full_name || 'İsimsiz'

      const convList: Conversation[] = (jobs || []).map((j) => {
        const b = byJob[j.id]
        const otherId = j.customer_id === me ? j.provider_id : j.customer_id
        return {
          job_id: j.id,
          job_title: j.title,
          other_name: otherId ? (nameBy[otherId] || 'Uzman') : 'Uzman',
          last_body: b?.last?.body?.slice(0, 60) || '',
          last_at: b?.last?.created_at || '',
          unread_count: b?.unreadCount ?? 0,
        }
      })
      convList.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
      setConversations(convList)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-4 lg:px-6 py-4 sticky top-0 bg-slate-50/95 backdrop-blur border-b border-slate-100 z-10">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sohbetler</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Mesajlar</h1>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
            <div className="text-5xl mb-3">💬</div>
            <p className="font-bold text-slate-700 mb-1">Henüz mesaj yok</p>
            <p className="text-sm text-slate-500">İş talebi oluşturduğunuzda uzmanlarla buradan yazışabilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => {
              const hasUnread = c.unread_count > 0
              return (
                <button
                  key={c.job_id}
                  type="button"
                  onClick={() => openChat(c.job_id)}
                  className={`w-full text-left bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition-colors ${
                    hasUnread ? 'border-blue-200' : 'border-slate-100'
                  } hover:bg-slate-50`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {c.other_name}
                    </p>
                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-slate-700' : 'text-slate-500'}`}>
                      {c.last_body || '—'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {c.last_at ? new Date(c.last_at).toLocaleString('tr-TR') : ''}
                    </p>
                  </div>
                  {hasUnread && (
                    <span className="flex-shrink-0 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {c.unread_count > 99 ? '99+' : c.unread_count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
