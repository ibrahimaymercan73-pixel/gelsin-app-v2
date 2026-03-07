'use client'

import { useEffect, useState } from 'react'
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
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
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

      const list = (data || []) as Notification[]
      setItems(list.filter((n) => n.type !== 'chat_message'))

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
      <div className="flex items-center justify-center min-h-dvh bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-4 lg:px-6 py-4 sticky top-0 bg-slate-50/95 backdrop-blur border-b border-slate-100 z-10">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sistem bildirimleri</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Bildirimler</h1>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
            <div className="text-5xl mb-3">🔔</div>
            <p className="font-bold text-slate-700 mb-1">Henüz bildirim yok</p>
            <p className="text-sm text-slate-500">İşlerinizle ilgili teklif ve güncellemeler burada görünecek.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <div
                key={n.id}
                className={`w-full text-left bg-white rounded-2xl p-4 border shadow-sm ${
                  n.is_read ? 'border-slate-100' : 'border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="text-lg">🔔</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{n.body}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
