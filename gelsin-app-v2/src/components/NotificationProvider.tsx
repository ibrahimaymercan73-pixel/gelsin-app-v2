'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'

interface NotificationContextType {
  unreadCount: number
  refreshUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
})

export const useNotifications = () => useContext(NotificationContext)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchUnreadCount = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setUnreadCount(0)
      setUserId(null)
      return
    }
    
    setUserId(user.id)

    // Rozet sadece pazarlık/teklif vb. bildirimleri saysın; mesajlar Sohbetler'de
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .or('type.is.null,type.neq.chat_message')

    setUnreadCount(count ?? 0)
  }, [])

  // Auth state değişince (giriş/çıkış) userId güncelle – masaüstü/mobil fark etmez, her zaman senkron
  useEffect(() => {
    const supabase = createClient()
    fetchUnreadCount()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUnreadCount()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUnreadCount])

  // userId varsa Realtime subscription kur – tek kaynak, root layout’ta, tüm cihazlarda
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const currentUserId = userId

    const notifChannel = supabase
      .channel('db-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as any
          
          if (newNotif.user_id !== currentUserId) return
          
          setUnreadCount(prev => prev + 1)

          // Mesaj bildiriminde toast gösterme – tek toast messages kanalından gelecek (gönderen adıyla)
          if (newNotif.type === 'chat_message') return

          toast(newNotif.title || 'Yeni Bildirim', {
            description: newNotif.body?.slice(0, 60) || '',
            action: newNotif.related_job_id ? {
              label: 'Görüntüle',
              onClick: () => router.push(`/customer/jobs/${newNotif.related_job_id}`),
            } : undefined,
            duration: 4000,
          })
        }
      )
      .subscribe()

    const msgChannel = supabase
      .channel('db-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const msg = payload.new as any
          if (msg.receiver_id !== currentUserId) return

          const { data: sender } = await supabase
            .from('profiles_public')
            .select('full_name')
            .eq('id', msg.sender_id)
            .single()

          const senderName = sender?.full_name || 'Birisi'
          const preview = msg.body?.slice(0, 40) || 'Yeni mesaj'
          const jobId = msg.job_id

          toast.custom(
            () => (
              <div
                className="flex items-center gap-3 w-full max-w-sm bg-white border border-gray-100 shadow-lg rounded-2xl px-4 py-3"
                role="alert"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {senderName}: {preview}{preview.length >= 40 ? '…' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/chat/${jobId}`)}
                  className="flex-shrink-0 text-blue-600 font-medium text-sm hover:text-blue-700 hover:underline"
                >
                  Yanıtla
                </button>
              </div>
            ),
            { duration: 4000 }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(msgChannel)
    }
  }, [userId, router])

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount: fetchUnreadCount }}>
      <Toaster 
        position="top-center"
        expand={true}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #f3f4f6',
            borderRadius: '1rem',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            fontSize: '14px',
          },
          classNames: {
            title: 'text-gray-900 font-medium',
            description: 'text-gray-600',
            actionButton: 'text-blue-600 font-medium bg-transparent border-0',
            cancelButton: 'text-gray-500 bg-transparent border-0',
          },
        }}
      />
      {children}
    </NotificationContext.Provider>
  )
}

export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null
  
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg shadow-red-500/30 animate-pulse">
      {count > 99 ? '99+' : count}
    </span>
  )
}
