'use client'

import { useRouter } from 'next/navigation'

export default function PaymentFailPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Ödeme Başarısız</h1>
        <p className="text-sm text-slate-600 mb-6">
          Ödeme işlemi tamamlanamadı. Kart bilgilerinizi ve bakiyenizi kontrol ederek tekrar deneyebilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}

