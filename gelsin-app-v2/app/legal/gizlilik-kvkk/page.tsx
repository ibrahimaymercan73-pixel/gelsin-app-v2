'use client'

export default function GizlilikKvkkPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Gizlilik Politikası &amp; KVKK Aydınlatma Metni
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) ve ilgili
            mevzuat kapsamında, GELSİN platformu üzerinden toplanan kişisel verilerin işlenmesine
            ilişkin esasları açıklar.
          </p>
        </header>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">1. Veri Sorumlusu</h2>
          <p>
            GELSİN (Gelsin.app), KVKK kapsamında veri sorumlusu sıfatıyla, platform
            kullanıcılarının kişisel verilerini ilgili mevzuata uygun olarak işler ve korur.
          </p>
          <p>
            <span className="font-semibold">İletişim:</span> destek@gelsin.dev / 0312 870 15 36
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">2. İşlenen Kişisel Veriler</h2>
          <p>
            GELSİN; üyelik, hizmet talebi, ödeme ve iletişim süreçleri kapsamında aşağıdaki
            kişisel verileri işleyebilir:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Kimlik bilgileri (ad, soyad vb.)</li>
            <li>İletişim bilgileri (telefon, e-posta, adres)</li>
            <li>Hizmet talebi ve iş geçmişi bilgileri</li>
            <li>Ödeme ve faturalama bilgileri (maskelemiş kart bilgileri, fatura bilgileri)</li>
            <li>Destek talepleri ve şikayet kayıtları</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">3. Kişisel Verilerin İşlenme Amaçları</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Platform üzerinden talep edilen hizmetlerin sunulması ve yönetilmesi</li>
            <li>Ödeme işlemlerinin gerçekleştirilmesi ve güvenliğinin sağlanması</li>
            <li>Destek talepleri ve şikayet süreçlerinin yönetilmesi</li>
            <li>Kullanıcı deneyiminin iyileştirilmesi ve hizmet kalitesinin artırılması</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">4. Çerezler (Cookies)</h2>
          <p>
            GELSİN, site ve uygulama deneyiminizi iyileştirmek, istatistik tutmak ve güvenliği
            sağlamak amacıyla çerezler kullanabilir. Tarayıcınızın ayarlarından çerez tercihlerinizi
            yönetebilirsiniz; ancak çerezlerin kapatılması halinde bazı özellikler sınırlanabilir.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">5. Kişisel Verilerin Aktarılması</h2>
          <p>
            Kişisel verileriniz, yalnızca hizmetin ifası ve yasal yükümlülükler kapsamında;
            ödeme kuruluşları (PayTR vb.), iş ortaklarımız ve yetkili kamu kurumları ile gerekli
            olduğu ölçüde paylaşılabilir.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">6. KVKK Kapsamındaki Haklarınız</h2>
          <p>KVKK&apos;nın 11. maddesi kapsamında, GELSİN&apos;e başvurarak:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
            <li>İşleme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Eksik veya yanlış işlenmişse düzeltilmesini talep etme,</li>
            <li>İlgili mevzuat çerçevesinde silinmesini veya yok edilmesini talep etme,</li>
            <li>Otomatik sistemler ile analiz edilmesine itiraz etme,</li>
            <li>Haklarınıza aykırı bir sonuç doğması halinde zararın giderilmesini talep etme</li>
          </ul>
          <p>
            haklarına sahipsiniz. Bu haklarınızı kullanmak için destek@gelsin.dev adresine
            e-posta gönderebilirsiniz.
          </p>
        </section>
      </div>
    </div>
  )
}

