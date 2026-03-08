'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function UstaVerifyEmailPage() {
  const router = useRouter()
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      // Geçici: 6 haneli kodu konsola bas
      const generated = Math.floor(100000 + Math.random() * 900000).toString()
      // eslint-disable-next-line no-console
      console.log('USTA EMAIL VERIFY CODE:', generated)
      setCode(generated)
    }
    setup()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 text-center">
        <div className="text-4xl mb-2">🔐</div>
        <h1 className="text-xl font-black text-white">
          Uzman Hesabı Doğrulaması
        </h1>
        <p className="text-slate-400 text-sm">
          Email doğrulama akışı henüz tam bağlanmadı. Şimdilik test amaçlı
          olarak tarayıcı konsoluna 6 haneli bir kod yazdırıyoruz.
        </p>
        {code && (
          <p className="mt-3 text-xs text-slate-500">
            (Geliştirme için: konsolda{' '}
            <span className="font-mono text-slate-300">{code}</span> kodunu
            görebilirsiniz.)
          </p>
        )}
        <button
          type="button"
          onClick={() => router.replace('/choose-role')}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-sm"
        >
          Tamam, Devam Et
        </button>
      </div>
    </div>
  )
}

