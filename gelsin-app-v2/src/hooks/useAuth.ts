'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getCurrentUserAndRoleWithRefresh } from '@/lib/auth'
import type { UserRole } from '@/lib/supabase'

export interface UseAuthResult {
  user: User | null
  role: UserRole | null
  loading: boolean
}

export function useAuth(): UseAuthResult {
  const [state, setState] = useState<UseAuthResult>({
    user: null,
    role: null,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    getCurrentUserAndRoleWithRefresh().then(({ user, role }) => {
      if (!cancelled) setState({ user, role, loading: false })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
