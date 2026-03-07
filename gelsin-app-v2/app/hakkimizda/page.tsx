import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Hakkımızda | Gelsin App',
  description: 'Gelsin App — İhtiyacın olan uzman kapında. Türkiye\'nin yeni nesil hizmet pazar yeri.',
}

export default function HakkimizdaPage() {
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
          Gelsin App: İhtiyacın Olan Uzman Kapında!
        </h1>
        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4">
          <p>
            Gelsin App, günlük hayatınızda ihtiyaç duyduğunuz tüm hizmetleri tek bir platformda toplayan,
            Türkiye&apos;nin yeni nesil hizmet pazar yeridir. Evinizdeki ufak bir tesisat arızasından, yolda
            kalan aracınız için çekiciye; çocuğunuzun matematik dersinden, evinize gelecek güzellik
            uzmanına kadar her alanda güvenilir profesyonelleri saniyeler içinde sizinle buluşturuyoruz.
          </p>
          <p>
            Amacımız; hizmet almak isteyenlerin saatlerce usta arama derdine son vermek, hizmet veren
            profesyonellerin ise dijital dünyada işlerini büyüterek daha fazla müşteriye ulaşmasını
            sağlamaktır. Gelsin ile zamanınız size, işiniz uzmanına kalsın!
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
