'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserAndRole } from '@/lib/auth'

const slides = [
  {
    icon: '🏠',
    title: 'Aradığın Usta\nAnında Kapında',
    desc: 'Tamir, temizlik, halı yıkama... Pursaklar\'ın en güvenilir profesyonelleri sadece bir tık uzağınızda.',
    bg: 'from-blue-600 to-blue-900',
  },
  {
    icon: '⚡',
    title: 'Hızlı ve Şeffaf\nTeklif Sistemi',
    desc: 'İhtiyacınızı belirtin, çevrenizdeki ustalardan anında fiyat teklifi alın. Puanları karşılaştırın, en iyi seçimi yapın.',
    bg: 'from-indigo-600 to-blue-800',
  },
  {
    icon: '🔒',
    title: '%100 Güvenli\nÖdeme Altyapısı',
    desc: 'İşiniz başarıyla tamamlanıp siz onay verene kadar paranız güvende. Karekod sistemiyle sorunsuz hizmet.',
    bg: 'from-blue-800 to-indigo-950',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  useEffect(() => {
    const check = async () => {
      const { user, role } = await getCurrentUserAndRole()

      if (!user) return

      if (user && !role) {
        router.replace('/role-selection')
        return
      }

      if (role === 'admin') router.replace('/admin')
      else if (role === 'provider') router.replace('/provider')
      else if (role === 'customer') router.replace('/customer')
    }
    check()
  }, [router])

  const slide = slides[step]

  return (
    <div className="min-h-screen flex flex-col w-full bg-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Slayt Alanı - Ekranı Ferahça Kaplar */}
      <div className={`bg-gradient-to-br ${slide.bg} flex-1 flex flex-col items-center justify-center p-8 md:p-16 text-white text-center transition-all duration-700 ease-in-out w-full`}>
        
        <div className="text-8xl md:text-[9rem] mb-8 md:mb-12 drop-shadow-2xl animate-scale-in">
          {slide.icon}
        </div>
        
        <h1 className="text-4xl md:text-7xl font-black leading-tight mb-6 md:mb-8 animate-slide-up whitespace-pre-line tracking-tight">
          {slide.title}
        </h1>
        
        <p className="text-blue-100 text-lg md:text-2xl leading-relaxed animate-slide-up delay-1 max-w-3xl mx-auto font-medium opacity-90">
          {slide.desc}
        </p>

        {/* Alt Noktalar (Dots) */}
        <div className="flex gap-3 mt-12 md:mt-16">
          {slides.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-500 ${
                i === step 
                  ? 'w-12 h-3 md:w-16 md:h-4 bg-white shadow-lg' 
                  : 'w-3 h-3 md:w-4 md:h-4 bg-white/30 hover:bg-white/50'
              }`} 
              aria-label={`Slayt ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Butonlar Alanı - Alt Kısım */}
      <div className="bg-white px-6 py-10 md:py-16 w-full flex flex-col items-center justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
        <div className="w-full max-w-7xl space-y-4 md:space-y-5">
          {step < slides.length - 1 ? (
            <>
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1" 
                onClick={() => setStep(s => s + 1)}
              >
                Devam Et →
              </button>
              <button 
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold transition-all border border-slate-200" 
                onClick={() => router.push('/login')}
              >
                Geç ve Giriş Yap
              </button>
            </>
          ) : (
            <>
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-3" 
                onClick={() => router.push('/login?role=customer')}
              >
                <span className="text-2xl">🏡</span> Hizmet Almak İstiyorum
              </button>
              <button 
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold transition-all border border-indigo-200 flex items-center justify-center gap-3" 
                onClick={() => router.push('/login?role=provider')}
              >
                <span className="text-2xl">🔧</span> Usta Olarak Katıl
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}