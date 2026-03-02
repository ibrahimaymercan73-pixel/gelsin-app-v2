'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const slides = [
  {
    icon: '🏠',
    title: 'Evinize Usta\nKapınıza Gelsin',
    desc: 'Tamir, temizlik, halı yıkama... Tüm ev hizmetleri için güvenilir ustalar bir tık uzağınızda.',
    bg: 'from-blue-600 to-blue-800',
  },
  {
    icon: '⚡',
    title: 'Anında Teklif\nAlın',
    desc: 'Yakınızdaki ustalar fiyat tekliflerini gönderir. En uygun fiyatlı ve puanlı ustayı seçin.',
    bg: 'from-indigo-600 to-blue-700',
  },
  {
    icon: '🔒',
    title: 'Güvenli Ödeme\nSistemi',
    desc: 'QR kod doğrulama ile iş başlar ve biter. Paranız iş tamamlanana kadar güvende.',
    bg: 'from-blue-700 to-indigo-800',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (data?.role === 'admin') router.replace('/admin')
        else if (data?.role === 'provider') router.replace('/provider')
        else if (data?.role === 'customer') router.replace('/customer')
      }
    }
    check()
  }, [router])

  const slide = slides[step]

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto">
      <div className={`bg-gradient-to-br ${slide.bg} flex-1 flex flex-col items-center justify-center px-8 text-white text-center transition-all duration-500`}>
        <div className="text-8xl mb-8 animate-scale-in">{slide.icon}</div>
        <h1 className="text-3xl font-black leading-tight mb-4 animate-slide-up whitespace-pre-line">
          {slide.title}
        </h1>
        <p className="text-blue-100 text-base leading-relaxed animate-slide-up delay-1">
          {slide.desc}
        </p>

        {/* Dots */}
        <div className="flex gap-2 mt-10">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-300 ${i === step ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />
          ))}
        </div>
      </div>

      <div className="bg-white px-6 py-8 space-y-3 max-w-md w-full mx-auto">
        {step < slides.length - 1 ? (
          <>
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>
              Devam Et →
            </button>
            <button className="btn-secondary" onClick={() => router.push('/login')}>
              Giriş Yap
            </button>
          </>
        ) : (
          <>
            <button className="btn-primary" onClick={() => router.push('/login?role=customer')}>
              🏡 Müşteri Olarak Başla
            </button>
            <button className="btn-secondary" onClick={() => router.push('/login?role=provider')}>
              🔧 Usta Olarak Başla
            </button>
          </>
        )}
      </div>
    </div>
  )
}
