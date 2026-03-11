'use client'

import Link from 'next/link'

export default function Page() {
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
          <Link
            href="/cekici/giris"
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
          </Link>

          <Link
            href="/sofor/giris"
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
          </Link>
        </main>
      </div>
    </div>
  )
}

