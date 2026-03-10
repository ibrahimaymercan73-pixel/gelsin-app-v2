'use client'

export default function MesafeliSatisPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Mesafeli Satış Sözleşmesi
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Bu metin, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
            Yönetmeliği uyarınca bilgilendirme amacıyla hazırlanmıştır.
          </p>
        </header>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">1. Taraflar</h2>
          <p>
            <span className="font-semibold">Hizmet Sağlayıcı (Platform):</span> Gelsin.app
            (bundan sonra kısaca &quot;GELSİN&quot; olarak anılacaktır).
          </p>
          <p>
            <span className="font-semibold">Adres:</span> Belediye Caddesi 35/C, Pursaklar / ANKARA
          </p>
          <p>
            <span className="font-semibold">E-posta:</span> destek@gelsin.dev
          </p>
          <p>
            <span className="font-semibold">Telefon:</span> 0312 870 15 36
          </p>
          <p>
            <span className="font-semibold">Müşteri:</span> GELSİN platformuna üye olan ve hizmet
            talebi oluşturan gerçek veya tüzel kişi.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">2. Sözleşmenin Konusu</h2>
          <p>
            İşbu Mesafeli Satış Sözleşmesi; Müşteri tarafından GELSİN mobil uygulaması veya web
            sitesi üzerinden talep edilen hizmete ilişkin olarak, hizmet bedelinin ödenmesi ve bu
            ödemenin PayTR tarafından sağlanan ödeme altyapısı ile &quot;escrow&quot; (emanet)
            hesabında tutulması, hizmetin tamamlanması sonrasında ilgili uzmana aktarılması veya
            iade edilmesine ilişkin şart ve koşulları düzenler.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">3. Hizmetin Niteliği ve Bedeli</h2>
          <p>
            Müşteri tarafından talep edilen hizmetin türü, kapsamı, süresi ve toplam bedeli; GELSİN
            platformunda oluşturulan iş ilanı ve bu ilana uzmanlar tarafından verilen teklifler
            üzerinden belirlenir. Müşteri, seçtiği uzmanla ilgili &quot;onay&quot; adımında
            hizmetin toplam bedelini, komisyon oranlarını ve ödeme şartlarını elektronik ortamda
            görerek onaylar.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">4. Ödeme ve Teslimat</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Ödeme, PayTR ödeme altyapısı üzerinden kredi/banka kartı veya diğer desteklenen
              yöntemlerle alınır.
            </li>
            <li>
              Ödeme tutarı, hizmet tamamlanana kadar GELSİN nezdinde emanet hesabında tutulur;
              uzmanlara doğrudan ödeme yapılmaz.
            </li>
            <li>
              Müşteri, hizmetin tamamlanmasını onayladığında veya bitiş QR kodunu kullanarak işi
              sonlandırdığında, emanet tutar ilgili uzmana aktarılmak üzere işleme alınır.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">5. Cayma Hakkı ve İptal</h2>
          <p>
            Hizmet, Müşteri talebi üzerine ve Müşterinin açık onayı ile anında veya belirlenen
            tarihte ifa edilmeye başlandığından, 6502 sayılı Kanun kapsamındaki klasik cayma hakkı
            her durumda birebir uygulanamayabilir. Ancak GELSİN, &quot;İptal &amp; İade
            Koşulları&quot; bölümünde açıklanan esaslara göre Müşteri ve uzman arasındaki
            uyuşmazlıklarda hakem rolü üstlenebilir.
          </p>
          <p>
            Hizmet başlamadan önce talebin iptal edilmesi halinde, Müşterinin ödediği bedel
            platform kuralları çerçevesinde iade edilebilir.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">6. Uyuşmazlıkların Çözümü</h2>
          <p>
            İşbu sözleşmeden doğabilecek her türlü uyuşmazlıkta, Tüketici Hakem Heyetleri ve
            Tüketici Mahkemeleri yetkilidir. Müşteri, öncelikle GELSİN destek birimi ile iletişime
            geçerek uyuşmazlığın platform üzerindeki &quot;destek / anlaşmazlık&quot; modülü
            üzerinden çözülmesini talep edebilir.
          </p>
        </section>
      </div>
    </div>
  )
}

