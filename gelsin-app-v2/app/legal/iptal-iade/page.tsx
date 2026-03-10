'use client'

export default function IptalIadePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            İptal &amp; İade Koşulları
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Bu metin, GELSİN platformu üzerinden alınan hizmetlerde iptal ve iade süreçlerine
            ilişkin genel bilgilendirme amacıyla hazırlanmıştır.
          </p>
        </header>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">1. Hizmet Başlamadan Önce İptal</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Müşteri, uzman henüz işe başlamamışken (yani iş durumu &quot;yolda&quot; veya
              &quot;başlamadı&quot; iken) talebini iptal etmek isterse, platform kuralları
              çerçevesinde ödeme tutarının tamamı iade edilebilir.
            </li>
            <li>
              İptal talebi, uygulama içindeki &quot;İptal / Uyuşmazlık&quot; akışı veya destek
              talebi üzerinden yapılmalıdır.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">2. Hizmet Sırasında veya Sonrasında İptal</h2>
          <p>
            Uzman işe başladıktan sonra yapılacak iptal talepleri, hizmetin hangi aşamada
            olduğuna ve ortaya çıkan maliyete göre GELSİN destek ekibi tarafından değerlendirilir.
            Gerekli durumlarda kısmi iade veya hiç iade olmaması söz konusu olabilir.
          </p>
          <p>
            Müşteri, işten memnun kalmadığı durumlarda platform üzerindeki &quot;Uyuşmazlık
            Oluştur&quot; adımını kullanarak durumu GELSİN destek ekibine iletebilir. İnceleme
            sonucunda, işin tamamının veya bir kısmının iadesine karar verilebilir.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">3. İade Süreci</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              İade kararı verildikten sonra, ödeme tutarı PayTR altyapısı üzerinden Müşterinin
              ödeme yaptığı karta veya ilgili hesabına, bankanın işlem sürelerine bağlı olarak
              genellikle 3-10 iş günü içinde yansıtılır.
            </li>
            <li>
              GELSİN, iade sürecini başlatır; ancak iadenin hesaba geçiş süresi bankalar arası
              işleyişe göre değişiklik gösterebilir.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">4. Uzmana Yapılan Ödemeler</h2>
          <p>
            Müşteri tarafından onaylanan ve uzmana aktarım süreci başlatılan ödemelerde, banka
            transferi tamamlandıktan sonra iade yapılması teknik olarak mümkün olmayabilir.
            Bu tür durumlarda, uzman ile Müşteri arasındaki mutabakat ve fatura süreçleri esas
            alınır.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-800 leading-relaxed bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900">5. Destek ve İletişim</h2>
          <p>
            İptal ve iade talepleriniz için GELSİN uygulaması içindeki &quot;Destek&quot;
            bölümünden destek bileti oluşturabilir veya iletişim sayfasında yer alan kanallar
            üzerinden bize ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </div>
  )
}

