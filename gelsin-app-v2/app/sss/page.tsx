import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Sıkça Sorulan Sorular | Gelsin App',
  description: 'Gelsin App hakkında sıkça sorulan sorular ve cevapları.',
}

const FAQ = [
  {
    s: 'Gelsin App ücretli mi?',
    c: 'Hayır, Gelsin App\'e üye olmak ve iş talebi oluşturmak tamamen ücretsizdir. Sadece anlaştığınız uzmana hizmet bedelini ödersiniz.',
  },
  {
    s: 'Uzmanlara nasıl güvenebilirim?',
    c: 'Sistemimize kayıt olan tüm uzmanlar, profil değerlendirme sürecinden geçerler. Hizmet almadan önce uzmanların geçmiş işlerini, müşteri yorumlarını ve puanlarını inceleyerek güvenle seçim yapabilirsiniz.',
  },
  {
    s: 'Hizmetten memnun kalmazsam ne olur?',
    c: 'Gelsin App bir aracı (yer sağlayıcı) platformdur. Hizmet kalitesi doğrudan uzmanın sorumluluğundadır. Ancak memnuniyetsizlik durumunda destek ekibimizle iletişime geçebilir ve uzmana düşük puan/yorum vererek diğer kullanıcıları bilgilendirebilirsiniz. Kuralları ihlal eden uzmanların hesapları sistemden uzaklaştırılır.',
  },
]

export default function SSSPage() {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8">
          Sıkça Sorulan Sorular
        </h1>
        <div className="space-y-8">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="font-semibold text-slate-900 mb-2">S: {item.s}</p>
              <p className="text-slate-700 leading-relaxed">C: {item.c}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
