'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Notification = {
  id: string
  title: string
  body: string | null
  type: string | null
  created_at: string
  is_read: boolean | null
  related_job_id?: string | null
}

export default function CustomerNotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setItems([])
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, type, created_at, is_read, related_job_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setItems((data || []) as Notification[])

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
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
            Bildirimler
          </p>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 mt-0.5">
            Müşteri Bildirimleri
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-3">
        {items.length === 0 && (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
            <div className="text-5xl mb-3">🔔</div>
            <p className="font-bold text-slate-700 mb-1">Henüz bildirim yok</p>
            <p className="text-xs text-slate-400">
              İşlerinizle ilgili bildirimler burada görünecek.
            </p>
          </div>
        )}

        {items.map((n) => {
          const isChat = n.type === 'chat_message' && n.related_job_id
          const clickable = isChat

          const handleClick = () => {
            if (isChat && n.related_job_id) {
              router.push(`/chat/${n.related_job_id}`)
            }
          }

          return (
            <button
              key={n.id}
              type="button"
              onClick={handleClick}
              className={`w-full text-left bg-white rounded-2xl p-4 border ${
                n.is_read ? 'border-slate-100' : 'border-blue-200'
              } shadow-sm flex items-start gap-3 ${
                clickable ? 'hover:bg-slate-50 cursor-pointer' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
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
                  {new Date(n.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

