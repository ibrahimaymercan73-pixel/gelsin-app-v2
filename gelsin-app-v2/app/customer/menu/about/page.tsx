'use client'

import Link from 'next/link'

export default function CustomerMenuAboutPage() {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-4 flex items-center gap-3">
        <Link href="/customer/menu" className="text-slate-600 p-1 -ml-1" aria-label="Geri">←</Link>
        <h1 className="text-lg font-bold text-slate-900">Hakkımızda</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 text-slate-600 text-sm leading-relaxed">
        <p className="mb-4">
          Gelsin, ihtiyacınız olan hizmete hızlı ve güvenilir şekilde ulaşmanız için tasarlandı.
          Uzmanlardan anında teklif alın, işinizi kolayca çözün.
        </p>
        <Link href="/customer/menu" className="text-blue-600 font-medium">← Menüye dön</Link>
      </div>
    </div>
  )
}
