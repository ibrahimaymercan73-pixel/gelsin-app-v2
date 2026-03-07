'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Ana sayfa → doğrudan dashboard'a yönlendir. */
export default function CustomerHomeRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/customer/dashboard')
  }, [router])
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#EBEBEB]">
      <div className="w-8 h-8 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
    </div>
  )
}
