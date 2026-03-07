import Link from 'next/link'

const SOCIAL = [
  { name: 'Instagram', href: '#', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
  { name: 'Twitter', href: '#', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  { name: 'LinkedIn', href: '#', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
]

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Sütun 1: Kurumsal */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-black text-xl tracking-tight">
              GELSİN<span className="text-blue-400">.</span>
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              İhtiyacın olan uzman saniyeler içinde kapında. Zamanın sana, işin uzmanına kalsın.
            </p>
            <nav className="flex flex-col gap-2">
              <Link href="/hakkimizda" className="text-sm hover:text-white transition-colors">
                Hakkımızda
              </Link>
              <Link href="/iletisim" className="text-sm hover:text-white transition-colors">
                İletişim
              </Link>
              <Link href="/sss" className="text-sm hover:text-white transition-colors">
                Sıkça Sorulan Sorular
              </Link>
            </nav>
          </div>

          {/* Sütun 2: Hizmetlerimiz */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Hizmetlerimiz
            </h3>
            <nav className="flex flex-col gap-2">
              <Link href="/customer/new-job?cat=ev_yasam" className="text-sm hover:text-white transition-colors">
                Ev & Yaşam
              </Link>
              <Link href="/customer/new-job?cat=arac_yol" className="text-sm hover:text-white transition-colors">
                Araç & Yol Yardım
              </Link>
              <Link href="/customer/new-job?cat=guzellik" className="text-sm hover:text-white transition-colors">
                Güzellik & Bakım
              </Link>
              <Link href="/customer/new-job?cat=egitim" className="text-sm hover:text-white transition-colors">
                Eğitim & Özel Ders
              </Link>
              <Link href="/customer/new-job?cat=kurumsal" className="text-sm hover:text-white transition-colors">
                Kurumsal Hizmetler
              </Link>
            </nav>
          </div>

          {/* Sütun 3: Yasal */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Yasal
            </h3>
            <nav className="flex flex-col gap-2">
              <Link href="/kullanim-sartlari" className="text-sm hover:text-white transition-colors">
                Kullanıcı Sözleşmesi
              </Link>
              <Link href="/gizlilik" className="text-sm hover:text-white transition-colors">
                Gizlilik Politikası
              </Link>
              <Link href="/kvkk" className="text-sm hover:text-white transition-colors">
                KVKK Aydınlatma Metni
              </Link>
              <Link href="/cerez-politikasi" className="text-sm hover:text-white transition-colors">
                Çerez Politikası
              </Link>
            </nav>
          </div>

          {/* Sütun 4: Uzmanlar İçin */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Uzmanlar / İş Ortakları
            </h3>
            <nav className="flex flex-col gap-2">
              <Link href="/register?role=provider" className="text-sm hover:text-white transition-colors">
                Uzman Olarak Katıl
              </Link>
              <Link href="/login" className="text-sm hover:text-white transition-colors">
                Uzman Girişi
              </Link>
              <Link href="/uzman-nasil-calisir" className="text-sm hover:text-white transition-colors">
                Nasıl Çalışır?
              </Link>
            </nav>
          </div>
        </div>

        {/* Alt Bar */}
        <div className="mt-12 pt-8 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs sm:text-sm order-2 sm:order-1">
            © 2026 GELSİN App. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-4 order-1 sm:order-2">
            {SOCIAL.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={item.name}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
