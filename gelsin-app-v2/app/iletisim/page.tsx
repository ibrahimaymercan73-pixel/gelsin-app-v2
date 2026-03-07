import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'İletişim | Gelsin App',
  description: 'Gelsin App destek ve iletişim bilgileri.',
}

export default function IletisimPage() {
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
          Bize Ulaşın
        </h1>
        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4">
          <p>
            Gelsin App deneyiminizle ilgili her türlü soru, öneri ve destek talebiniz için buradayız.
          </p>
          <p>
            <strong>Müşteri ve Uzman Destek E-Posta:</strong>{' '}
            <a href="mailto:destek@gelsin.app" className="text-blue-600 hover:underline">
              destek@gelsin.app
            </a>
          </p>
          <p>
            <strong>Çalışma Saatlerimiz:</strong> Hafta içi 09:00 - 18:00
          </p>
          <p className="text-slate-600 text-sm">
            Not: Acil yol yardım veya anlık hizmet talepleriniz için doğrudan uygulama üzerinden
            ilgili uzmanla iletişime geçebilirsiniz.
          </p>
          <p>
            Gelsin ekibi olarak mesajlarınıza en geç 24 saat içinde dönüş yapmaktan mutluluk duyarız.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
