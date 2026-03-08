import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'KVKK Aydınlatma Metni | Gelsin',
  description: 'Gelsin KVKK aydınlatma metni ve kişisel verilerin korunması.',
}

export default function KVKKPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Geri
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8 tracking-tight">
          KVKK Aydınlatma Metni
        </h1>

        <div className="prose prose-slate max-w-none text-slate-700">
          <p className="font-bold">Son Güncelleme Tarihi: 08.03.2026</p>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">1. Veri Sorumlusunun Kimliği</h3>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla <strong>GELSİN</strong> tarafından aşağıda açıklanan kapsamda işlenebilecektir.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">2. Hangi Kişisel Verilerinizi İşliyoruz?</h3>
          <p>Platformumuzu kullandığınızda aşağıdaki verilerinizi topluyoruz:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Kimlik Bilgileri:</strong> Ad, Soyad.</li>
            <li><strong>İletişim Bilgileri:</strong> E-posta adresi, Telefon Numarası.</li>
            <li><strong>Konum ve Adres Bilgileri:</strong> Hizmetin ifa edileceği ev/iş yeri adresiniz.</li>
            <li><strong>İşlem Güvenliği Bilgileri:</strong> IP adresiniz, giriş çıkış logları (Yasal zorunluluklar gereği).</li>
          </ul>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">3. Kişisel Verilerin İşlenme Amacı ve Hukuki Sebebi</h3>
          <p>
            Kişisel verileriniz; hizmet taleplerinizin alınması, size en uygun Uzmanın yönlendirilmesi, hizmetin ifası için Uzman&apos;ın size ulaşabilmesi, müşteri destek süreçlerinin (şikayet/talep) yürütülmesi ve yasal yükümlülüklerimizin (5651 sayılı kanun) yerine getirilmesi amaçlarıyla, &quot;Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması&quot; hukuki sebebine dayanarak işlenmektedir.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">4. Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h3>
          <p>
            Toplanan kişisel verileriniz, <strong>sadece hizmetin yerine getirilebilmesi amacıyla</strong> (örn: ustanın adresinize gelebilmesi için) o işi yapacak olan <strong>Uzman/Hizmet Veren</strong> ile paylaşılır. Bunun dışında verileriniz hiçbir şekilde üçüncü taraf reklam veya pazarlama şirketlerine satılmaz, aktarılmaz. Kanuni zorunluluklar halinde resmi makamlarla paylaşılabilir.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">5. KVKK Kapsamındaki Haklarınız</h3>
          <p>
            KVKK&apos;nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, amacına uygun kullanılıp kullanılmadığını bilme, eksik/yanlış işlenmişse düzeltilmesini isteme ve silinmesini talep etme haklarına sahipsiniz. Bu taleplerinizi sistem içindeki Destek Merkezi üzerinden bize iletebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
