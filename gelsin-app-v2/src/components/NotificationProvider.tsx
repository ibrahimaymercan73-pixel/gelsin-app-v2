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
  const userIdRef = useRef<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setUnreadCount(0)
      userIdRef.current = null
      return
    }
    
    userIdRef.current = user.id

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setUnreadCount(count ?? 0)
  }, [])

  useEffect(() => {
    const init = async () => {
      await fetchUnreadCount()
      setInitialized(true)
    }
    init()
  }, [fetchUnreadCount])

  useEffect(() => {
    if (!initialized || !userIdRef.current) return

    const supabase = createClient()
    const currentUserId = userIdRef.current

    console.log('[NotificationProvider] Setting up realtime for user:', currentUserId)

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
          console.log('[NotificationProvider] New notification:', payload)
          const newNotif = payload.new as any
          
          if (newNotif.user_id === currentUserId) {
            console.log('[NotificationProvider] Notification is for this user!')
            setUnreadCount(prev => prev + 1)

            toast(newNotif.title || 'Yeni Bildirim', {
              description: newNotif.body?.slice(0, 60) || '',
              action: newNotif.related_job_id ? {
                label: 'Görüntüle',
                onClick: () => router.push(`/customer/jobs/${newNotif.related_job_id}`),
              } : undefined,
              duration: 6000,
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationProvider] Notifications channel status:', status)
      })

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
          console.log('[NotificationProvider] New message:', payload)
          const msg = payload.new as any
          
          if (msg.receiver_id === currentUserId) {
            console.log('[NotificationProvider] Message is for this user!')
            
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', msg.sender_id)
              .single()

            const senderName = sender?.full_name || 'Birisi'

            toast(`💬 ${senderName}`, {
              description: msg.body?.slice(0, 50) || 'Yeni mesaj',
              action: {
                label: 'Yanıtla',
                onClick: () => router.push(`/chat/${msg.job_id}`),
              },
              duration: 6000,
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationProvider] Messages channel status:', status)
      })

    return () => {
      console.log('[NotificationProvider] Cleaning up channels')
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(msgChannel)
    }
  }, [initialized, router])

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount: fetchUnreadCount }}>
      <Toaster 
        position="top-center"
        expand={true}
        richColors
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #475569',
            fontSize: '14px',
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
