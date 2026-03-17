'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function LiveSupportPaytrFailPage() {
  useEffect(() => {
    try {
      window.parent?.postMessage({ type: 'paytr-live-support-fail' }, '*')
    } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">❌</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Ödeme Başarısız</h1>
        <p className="text-sm text-slate-600 mb-6">
          Ödeme tamamlanamadı. Lütfen tekrar deneyin.
        </p>
        <Link
          href="/customer/live-support"
          className="inline-flex items-center justify-center w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm"
        >
          Geri Dön
        </Link>
      </div>
    </div>
  )
}

