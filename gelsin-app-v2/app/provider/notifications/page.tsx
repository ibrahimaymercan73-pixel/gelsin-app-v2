'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useChatOverlay } from '@/components/ChatOverlay'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 60 * 1000) return 'Az önce'
  if (diffMs < 24 * 60 * 60 * 1000 && isToday(d)) {
    return 'Bugün ' + format(d, 'HH:mm', { locale: tr })
  }
  if (isYesterday(d)) return 'Dün ' + format(d, 'HH:mm', { locale: tr })
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(d, { addSuffix: true, locale: tr })
  }
  return format(d, 'd MMM HH:mm', { locale: tr })
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-violet-100 text-violet-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
] as const

function getInitials(name: string): string {
  if (!name || name === 'Bilinmeyen Müşteri') return 'BM'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.slice(0, 2) || '?').toUpperCase()
}

function getAvatarColor(name: string): (typeof AVATAR_COLORS)[number] {
  const n = name || ''
  const idx = n.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[Math.abs(idx)]
}

type Notification = {
  id: string
  title: string
  body: string | null
  type: string | null
  created_at: string
  is_read: boolean | null
  related_job_id?: string | null
}

type Conversation = {
  job_id: string
  job_title: string
  other_name: string
  last_body: string
  last_at: string
  unread_count: number
}

export default function ProviderNotificationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { openChat } = useChatOverlay()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setItems([])
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
          if (!byJob[m.job_id]) {
            byJob[m.job_id] = { last: m, unreadCount: 0 }
          }
          if (m.receiver_id === me && (m.is_read === false || m.is_read == null)) {
            byJob[m.job_id].unreadCount += 1
          }
        }
      }

      const jobIds = Object.keys(byJob)
      if (jobIds.length > 0) {
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
        if (profiles) {
          for (const p of profiles) {
            nameBy[p.id] = p.full_name != null && p.full_name.trim() !== '' ? p.full_name : 'Bilinmeyen Müşteri'
          }
        }

        const convList: Conversation[] = (jobs || []).map((j) => {
          const b = byJob[j.id]
          const otherId = j.customer_id === me ? j.provider_id : j.customer_id
          return {
            job_id: j.id,
            job_title: j.title,
            other_name: otherId ? (nameBy[otherId] || 'Bilinmeyen Müşteri') : 'Bilinmeyen Müşteri',
            last_body: b?.last?.body?.slice(0, 60) || '',
            last_at: b?.last?.created_at || '',
            unread_count: b?.unreadCount ?? 0,
          }
        })
        convList.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
        setConversations(convList)
      } else {
        setConversations([])
      }

      // Bildirimler (sadece pazarlık, teklif vb. – mesajlar sadece Sohbetler'de)
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, type, created_at, is_read, related_job_id')
        .eq('user_id', me)
        .order('created_at', { ascending: false })

      const list = (data || []) as Notification[]
      setItems(list.filter((n) => n.type !== 'chat_message'))

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', me)
        .eq('is_read', false)

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#F4F7FA]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
            Mesajlar & Bildirimler
          </p>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 mt-0.5">
            Uzman Bildirimleri
          </h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sol: Sohbetler */}
        <section className="min-w-0">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            Sohbetler
          </h2>
          {conversations.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-slate-500 text-sm">Henüz sohbet yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => {
                const hasUnread = c.unread_count > 0
                const initials = getInitials(c.other_name)
                const avatarColor = getAvatarColor(c.other_name)
                return (
                  <button
                    key={c.job_id}
                    type="button"
                    onClick={() => openChat(c.job_id)}
                    className={`w-full text-left rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition-colors ${
                      hasUnread
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-white border-slate-100'
                    } hover:bg-slate-50`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${avatarColor}`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {c.other_name}
                      </p>
                      <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-slate-700' : 'text-slate-500'}`}>
                        {c.last_body || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {c.last_at ? formatRelativeDate(c.last_at) : ''}
                      </p>
                    </div>
                    {hasUnread && (
                      <>
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" aria-hidden />
                        <span className="flex-shrink-0 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {c.unread_count > 99 ? '99+' : c.unread_count}
                        </span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Sağ: Bildirimler */}
        <section className="min-w-0">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            Bildirimler
          </h2>
          {items.length === 0 && conversations.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 md:col-span-1">
              <div className="text-5xl mb-3">🔔</div>
              <p className="font-bold text-slate-700 mb-1">Henüz bildirim yok</p>
              <p className="text-xs text-slate-400">
                Teklifleriniz ve işlerinizle ilgili bildirimler burada görünecek.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-slate-500 text-sm">Henüz bildirim yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((n) => {
                const isChat = n.type === 'chat_message' && n.related_job_id
                const isBargain = n.type === 'offer_negotiate' && n.related_job_id
                const clickable = isChat || isBargain
                const unread = n.is_read === false || n.is_read == null

                const handleClick = () => {
                  if ((isChat || isBargain) && n.related_job_id) {
                    openChat(n.related_job_id)
                  }
                }

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={handleClick}
                    className={`w-full text-left rounded-2xl p-4 border shadow-sm flex items-start gap-3 ${
                      unread ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-100'
                    } ${clickable ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
                  >
                    <span className="flex-shrink-0 w-2 flex items-center justify-center mt-2.5">
                      {unread && <span className="w-2 h-2 rounded-full bg-blue-500" aria-hidden />}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🔔</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatRelativeDate(n.created_at)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
