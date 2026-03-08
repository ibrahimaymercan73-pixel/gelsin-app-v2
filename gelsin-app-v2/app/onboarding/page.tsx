'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getCurrentUserAndRole } from '@/lib/auth'

const slides = [
  {
    icon: '🏠',
    title: 'Aradığın Uzman\nAnında Kapında',
    desc: 'Tamir, temizlik, güzellik, eğitim... Türkiye\'nin en güvenilir uzmanları sadece bir tık uzağınızda.',
    bg: 'from-blue-600 to-blue-900',
  },
  {
    icon: '⚡',
    title: 'Hızlı ve Şeffaf\nTeklif Sistemi',
    desc: 'İhtiyacınızı belirtin, çevrenizdeki uzmanlardan anında fiyat teklifi alın. Puanları karşılaştırın, en iyi seçimi yapın.',
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
        router.replace('/choose-role')
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
    <div className="min-h-screen flex flex-col w-full bg-[#fafaf9] font-sans selection:bg-brand-500 selection:text-white">
      <div className={`bg-gradient-to-br ${slide.bg} flex-1 flex flex-col items-center justify-center p-8 md:p-16 text-white text-center transition-all duration-700 ease-in-out w-full`}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-8xl md:text-[9rem] mb-8 md:mb-12 drop-shadow-2xl"
        >
          {slide.icon}
        </motion.div>
        <motion.h1
          key={`title-${step}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="text-4xl md:text-7xl font-black leading-tight mb-6 md:mb-8 whitespace-pre-line tracking-tight"
        >
          {slide.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-white/90 text-lg md:text-2xl leading-relaxed max-w-3xl mx-auto font-medium"
        >
          {slide.desc}
        </motion.p>
        <div className="flex gap-3 mt-12 md:mt-16">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-500 active:scale-95 ${
                i === step ? 'w-12 h-3 md:w-16 md:h-4 bg-white shadow-lg' : 'w-3 h-3 md:w-4 md:h-4 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Slayt ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white px-6 py-10 md:py-16 w-full flex flex-col items-center justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.06)] z-10 border-t border-stone-100"
      >
        <div className="w-full max-w-7xl space-y-4 md:space-y-5">
          {step < slides.length - 1 ? (
            <>
              <button
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold transition-all shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 active:scale-[0.98]"
                onClick={() => setStep(s => s + 1)}
              >
                Devam Et →
              </button>
              <button
                className="w-full bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold transition-all border border-stone-200 active:scale-[0.98]"
                onClick={() => router.push('/login')}
              >
                Geç ve Giriş Yap
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold transition-all shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-3"
                onClick={() => router.push('/login?role=customer')}
              >
                <span className="text-2xl">🏡</span> Hizmet Almak İstiyorum
              </button>
              <button
                className="w-full bg-stone-50 hover:bg-stone-100 text-stone-700 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold transition-all border border-stone-200 flex items-center justify-center gap-3 active:scale-[0.98]"
                onClick={() => router.push('/login?role=provider')}
              >
                <span className="text-2xl">🔧</span> Uzman Olarak Katıl
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}