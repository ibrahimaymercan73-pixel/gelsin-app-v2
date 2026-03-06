'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import { useRouter } from 'next/navigation'

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
  const [isReady, setIsReady] = useState(false)
  const userIdRef = useRef<string | null>(null)

  const fetchUnreadCount = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUnreadCount(0)
      setUserId(null)
      userIdRef.current = null
      setIsReady(false)
      return
    }
    
    setUserId(user.id)
    userIdRef.current = user.id
    setIsReady(true)

    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setUnreadCount(notifCount ?? 0)
  }, [])

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  useEffect(() => {
    if (!isReady || !userId) return

    const supabase = createClient()
    const currentUserId = userIdRef.current

    const channel = supabase
      .channel('notifications-realtime-' + currentUserId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const newNotification = payload.new as any
          
          setUnreadCount((prev) => prev + 1)

          const title = newNotification.title || 'Yeni Bildirim'
          const body = newNotification.body || ''
          const jobId = newNotification.related_job_id

          toast(title, {
            description: body.length > 60 ? body.slice(0, 60) + '...' : body,
            action: jobId ? {
              label: 'Görüntüle',
              onClick: () => {
                const notifType = newNotification.type || ''
                if (notifType.includes('offer') || notifType.includes('job')) {
                  router.push(`/customer/jobs/${jobId}`)
                } else {
                  router.push(`/chat/${jobId}`)
                }
              },
            } : undefined,
            duration: 5000,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    const messagesChannel = supabase
      .channel('messages-realtime-' + currentUserId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any
          
          setUnreadCount((prev) => prev + 1)

          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newMessage.sender_id)
            .single()

          const senderName = sender?.full_name || 'Birisi'
          const preview = newMessage.body?.slice(0, 40) || 'Yeni mesaj'

          toast(`💬 ${senderName}`, {
            description: preview + (newMessage.body?.length > 40 ? '...' : ''),
            action: {
              label: 'Yanıtla',
              onClick: () => {
                router.push(`/chat/${newMessage.job_id}`)
              },
            },
            duration: 5000,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(messagesChannel)
    }
  }, [isReady, userId, fetchUnreadCount, router])

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount: fetchUnreadCount }}>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
        }}
        richColors
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
