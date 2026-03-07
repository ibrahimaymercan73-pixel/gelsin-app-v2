import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Çerez Politikası | Gelsin App',
  description: 'Gelsin App çerez kullanımı ve politikası.',
}

export default function CerezPolitikasiPage() {
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
          Çerez Politikası
        </h1>
        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4">
          <p>
            Gelsin App, web ve mobil deneyiminizi iyileştirmek ve oturumunuzu güvenli şekilde açık
            tutmak için temel (zorunlu) çerezleri kullanır. Bu çerezler olmadan giriş yapmanız ve
            uygulamanın temel işlevlerini kullanmanız mümkün olmaz.
          </p>
          <p>
            Üçüncü taraf reklam veya takip çerezleri kullanmıyoruz. Kişisel verilerinizin işlenmesi
            hakkında detaylı bilgi için{' '}
            <Link href="/kvkk" className="text-blue-600 hover:underline font-medium">
              KVKK Aydınlatma Metni ve Gizlilik Politikası
            </Link>{' '}
            sayfamızı inceleyebilirsiniz.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
