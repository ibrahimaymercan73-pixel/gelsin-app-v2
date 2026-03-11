'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function SoforPage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/sofor/giris')
        return
      }

      router.replace('/sofor/ustalar')
    }

    check()
  }, [router])

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-300" />
    </div>
  )
}

