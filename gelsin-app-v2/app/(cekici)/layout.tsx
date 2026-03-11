'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

export default function CekiciLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const publicPaths = ['/cekici/giris', '/cekici/kayit']
    if (publicPaths.includes(pathname)) {
      setOk(true)
      return
    }
    const run = async () => {
      const supabase = createHizmetlerClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/cekici/giris')
        return
      }
      setOk(true)
    }
    run()
  }, [router, pathname])

  if (!ok) return <div />
  return <>{children}</>
}
