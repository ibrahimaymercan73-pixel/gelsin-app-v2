'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Alt menüde "Mesajlar" /customer/messages ile açılsın; içerik bildirimler sayfasında. */
export default function CustomerMessagesRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/customer/notifications')
  }, [router])
  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
    </div>
  )
}
