import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'KVKK ve Gizlilik Politikası | Gelsin App',
  description: 'Gelsin App KVKK aydınlatma metni ve gizlilik politikası.',
}

const MADDELER = [
  {
    baslik: '1. Verilerin İşlenme Amacı',
    metin: 'Gelsin App, sizlere en iyi hizmeti sunabilmek için adınız, soyadınız, telefon numaranız ve konum/adres bilgilerinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işler ve güvenle saklar.',
  },
  {
    baslik: '2. Veri Paylaşımı',
    metin: 'Telefon numaranız ve açık adresiniz, SADECE siz bir uzmanın teklifini "Onayladığınızda" işin gerçekleşebilmesi amacıyla o uzmanla paylaşılır. Bunun dışında 3. şahıs veya kurumlarla asla reklam amacıyla paylaşılmaz veya satılmaz.',
  },
  {
    baslik: '3. Çerezler (Cookies)',
    metin: 'Platformumuz, deneyiminizi iyileştirmek ve oturumunuzu açık tutmak için temel çerezleri kullanır.',
  },
  {
    baslik: '4. Haklarınız',
    metin: 'Kullanıcılar, sistemdeki verilerinin silinmesini talep etme hakkına sahiptir. Hesap silme işlemleri doğrudan profil ayarlarından veya destek mailimiz üzerinden yapılabilir. İşlem tamamlandıktan sonra verileriniz yasal saklama süreleri haricinde veritabanımızdan kalıcı olarak imha edilir.',
  },
]

export default function KVKKPage() {
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
          KVKK Aydınlatma Metni ve Gizlilik Politikası
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
