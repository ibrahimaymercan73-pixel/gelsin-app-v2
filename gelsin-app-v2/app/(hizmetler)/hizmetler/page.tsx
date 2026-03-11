'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?redirect=/hizmetler')
      }
    }

    checkSession()
  }, [router])

  const goTo = (path: string) => {
    router.push(path)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 gap-6">
        <header className="flex justify-center">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/30">
              G
            </div>
            <span className="text-xl font-semibold tracking-[0.25em] uppercase text-slate-100">
              GELSİN
            </span>
          </div>
        </header>

        <main className="flex-1 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => goTo('/cekici/yeni')}
            className="w-full rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-slate-950 p-5 shadow-lg shadow-orange-500/30 flex flex-col items-start gap-2 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚛</span>
              <div className="flex flex-col items-start">
                <span className="text-base font-semibold">Çekici Çağır</span>
                <span className="text-xs font-medium text-amber-950/90">
                  Aracınız arızalandı mı? Hemen çekici çağırın
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => goTo('/sofor/yeni')}
            className="w-full rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-slate-900 text-slate-50 p-5 shadow-lg shadow-indigo-800/40 flex flex-col items-start gap-2 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👨‍✈️</span>
              <div className="flex flex-col items-start">
                <span className="text-base font-semibold">Şoför Çağır</span>
                <span className="text-xs text-slate-200/80">
                  Güvenli yolculuk için onaylı özel şoför
                </span>
              </div>
            </div>
          </button>
        </main>

        <footer className="flex flex-col gap-3 pb-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => goTo('/hizmetler/gecmis')}
            className="text-center underline underline-offset-4 decoration-slate-600 hover:text-slate-200"
          >
            Geçmiş Taleplerim
          </button>
          <button
            type="button"
            onClick={() => goTo('/')}
            className="text-center underline underline-offset-4 decoration-slate-600 hover:text-slate-200"
          >
            Ana Sayfaya Dön
          </button>
        </footer>
      </div>
    </div>
  )
}


