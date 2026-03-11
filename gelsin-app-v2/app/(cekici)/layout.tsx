'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CekiciLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const redirect = encodeURIComponent(pathname || '/cekici')
        router.replace(`/login?redirect=${redirect}`)
        return
      }
      setOk(true)
    }
    run()
  }, [router, pathname])

  if (!ok) return <div />
  return <>{children}</>
}
