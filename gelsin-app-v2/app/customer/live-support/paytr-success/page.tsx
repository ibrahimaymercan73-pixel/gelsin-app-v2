'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LiveSupportPaytrSuccessPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    try {
      window.parent?.postMessage({ type: 'paytr-live-support-success' }, '*')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const sid =
        url.searchParams.get('session_id') ||
        localStorage.getItem('live_support_session_id') ||
        ''
      if (sid) {
        localStorage.setItem('live_support_session_id', sid)
        setSessionId(sid)
      }
    } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Ödemeniz Alındı</h1>
        <p className="text-sm text-slate-600 mb-6">
          Ödemeniz alındı. Canlı destek başlatılıyor...
        </p>
        <button
          type="button"
          onClick={() => router.push('/customer/live-support?session_id=' + sessionId)}
          className="inline-flex items-center justify-center w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm"
        >
          Canlı Desteğe Dön
        </button>
      </div>
    </div>
  )
}

