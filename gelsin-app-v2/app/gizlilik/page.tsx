import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Gizlilik Politikası | Gelsin App',
  description: 'Gelsin App gizlilik politikası.',
}

export default function GizlilikPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
            ← Ana sayfa
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
          Gizlilik Politikası
        </h1>
        <p className="text-slate-700 leading-relaxed mb-6">
          Gizlilik ve kişisel verilerinizin işlenmesine ilişkin tüm bilgiler KVKK Aydınlatma Metni ve
          Gizlilik Politikası sayfamızda yer almaktadır.
        </p>
        <Link
          href="/kvkk"
          className="inline-flex items-center text-blue-600 font-semibold hover:underline"
        >
          KVKK Aydınlatma Metni ve Gizlilik Politikası sayfasına git →
        </Link>
      </main>
      <Footer />
    </div>
  )
}
