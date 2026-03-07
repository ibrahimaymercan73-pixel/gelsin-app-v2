import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Kullanıcı Sözleşmesi | Gelsin App',
  description: 'Gelsin App kullanıcı ve hizmet sözleşmesi.',
}

const MADDELER = [
  {
    baslik: '1. Taraflar ve Tanımlar',
    metin: 'Bu sözleşme, Gelsin App (Bundan sonra "Platform" olarak anılacaktır) ile platformu kullanan Müşteri ve Uzmanlar arasında akdedilmiştir.',
  },
  {
    baslik: '2. Platformun Rolü',
    metin: 'Gelsin App, 5651 sayılı Kanun kapsamında bir "Yer Sağlayıcı"dır. Platform, hizmet alan (Müşteri) ile hizmet veren (Uzman) tarafları bir araya getiren bağımsız bir pazaryeridir. Gelsin App, sunulan hizmetin kalitesi, güvenliği, yasalara uygunluğu veya uzmanların taahhütlerini yerine getirmesi konusunda hiçbir garanti vermez ve doğrudan sorumluluk kabul etmez.',
  },
  {
    baslik: '3. Anlaşmazlıklar',
    metin: 'Müşteri ve Uzman arasındaki ödeme, işin süresi ve kalitesi gibi konulardaki tüm anlaşmazlıklar tarafların kendi aralarındadır.',
  },
  {
    baslik: '4. Kullanım Kuralları',
    metin: 'Kullanıcılar platform üzerinde küfürlü, hakaret içeren veya yasadışı taleplerde bulunamazlar. Tespit edilen hesaplar kalıcı olarak kapatılır.',
  },
]

export default function KullanimSartlariPage() {
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
          Gelsin App Kullanıcı Sözleşmesi
        </h1>
        <div className="space-y-6">
          {MADDELER.map((m, i) => (
            <div key={i}>
              <h2 className="font-bold text-slate-900 mb-2">{m.baslik}</h2>
              <p className="text-slate-700 leading-relaxed">{m.metin}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
