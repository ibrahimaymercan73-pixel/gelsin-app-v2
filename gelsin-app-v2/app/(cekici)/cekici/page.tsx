'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function CekiciPage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/cekici/giris')
        return
      }

      router.replace('/cekici/ustalar')
    }

    check()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
    </div>
  )
}

