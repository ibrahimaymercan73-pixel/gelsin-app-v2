'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const PRESENCE_UPDATE_INTERVAL_MS = 60 * 1000 // 1 dakikada bir last_seen güncelle

/**
 * Usta (provider) uygulamadayken last_seen'i günceller.
 * Sadece provider layout içinde kullan (rol provider ise).
 */
export function useUpdatePresence() {
  const updatedRef = useRef(false)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const updateLastSeen = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'provider') return

      await supabase
        .from('provider_profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id)
    }

    const schedule = () => {
      updateLastSeen().then(() => { updatedRef.current = true })
      interval = setInterval(updateLastSeen, PRESENCE_UPDATE_INTERVAL_MS)
    }

    schedule()
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])
}
