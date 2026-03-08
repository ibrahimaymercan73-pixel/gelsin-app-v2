import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Gelsin Kullanıcı Sözleşmesi | Gelsin',
  description: 'Gelsin platformu kullanıcı sözleşmesi.',
}

export default function SozlesmePage() {
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
          Gelsin Kullanıcı Sözleşmesi
        </h1>

        <div className="prose prose-slate max-w-none text-slate-700">
          <p className="font-bold">Son Güncelleme Tarihi: 08.03.2026</p>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">1. Taraflar ve Konu</h3>
          <p>
            Bu Kullanıcı Sözleşmesi (&quot;Sözleşme&quot;), <strong>GELSİN</strong> platformu (bundan böyle &quot;Platform&quot; veya &quot;Gelsin&quot; olarak anılacaktır) ile Platform&apos;a üye olan veya hizmet alan/veren kullanıcılar (&quot;Kullanıcı&quot;) arasında, Platform&apos;un kullanım şartlarını ve tarafların hak ve yükümlülüklerini belirlemek amacıyla akdedilmiştir.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">2. Platformun Rolü (Aracı Hizmet Sağlayıcı)</h3>
          <p>
            Gelsin, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında bir <strong>&quot;Aracı Hizmet Sağlayıcı&quot; (Yer Sağlayıcı)</strong> konumundadır. Gelsin, hizmet alan (Müşteri) ile hizmet veren (Uzman/Usta) tarafları bir araya getiren bağımsız bir teknoloji platformudur.
          </p>
          <p>
            Gelsin, sunulan hizmetin bizzat sağlayıcısı değildir. Bu nedenle, Uzmanlar tarafından sağlanan hizmetlerin kalitesi, güvenliği, yasalara uygunluğu veya taahhüt edilen sürede tamamlanması konularında hiçbir hukuki veya cezai sorumluluk kabul etmez. Taraflar arasındaki iş sözleşmesi veya anlaşmazlıklar doğrudan Müşteri ve Uzman arasındadır.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">3. Kullanıcının Hak ve Yükümlülükleri</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Kullanıcı, Platform&apos;a kayıt olurken verdiği kişisel ve iletişim bilgilerinin doğru ve güncel olduğunu kabul eder.</li>
            <li>Kullanıcı, talep ettiği hizmetin ifası için ev adresi, telefon numarası gibi bilgilerin ilgili Uzman ile paylaşılmasını (KVKK kapsamında) peşinen onaylar.</li>
            <li>Müşteri, hizmet sonrasında Uzman&apos;a vereceği puan ve yorumların gerçeği yansıtmasından, iftira veya hakaret içermemesinden bizzat sorumludur.</li>
          </ul>

          <h3 className="text-xl font-bold mt-6 mb-2 text-slate-900">4. İptal ve Sorumluluk Sınırları</h3>
          <p>
            Gelsin, sistemin teknik arızalarından, siber saldırılardan veya mücbir sebeplerden doğacak erişim kesintilerinden sorumlu tutulamaz. Gelsin, şüpheli gördüğü işlemlerde veya kurallara aykırı davranan kullanıcıların hesaplarını önceden haber vermeksizin dondurma veya silme hakkını saklı tutar.
          </p>

          <p className="mt-8 text-sm text-slate-500">
            Bu sözleşme, Kullanıcı&apos;nın Platform&apos;a elektronik ortamda onay vermesi ile birlikte yürürlüğe girer.
          </p>
        </div>
      </div>
    </div>
  )
}
