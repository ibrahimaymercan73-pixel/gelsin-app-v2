'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

export default function MusteriLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createHizmetlerClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/hizmetler/giris')
        return
      }
      setOk(true)
    }
    check()
  }, [router, pathname])

  if (!ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  return <>{children}</>
}

