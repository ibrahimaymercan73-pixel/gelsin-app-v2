'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') as 'customer' | 'provider' | null

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatPhone = (p: string) => {
    const d = p.replace(/\D/g, '')
    if (d.startsWith('0')) return '+90' + d.slice(1)
    if (d.startsWith('90')) return '+' + d
    if (d.startsWith('+')) return p
    return '+90' + d
  }

  const sendOtp = async () => {
    setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ phone: formatPhone(phone) })
    if (error) setError('SMS gönderilemedi. Numarayı kontrol edin.')
    else setStep('otp')
    setLoading(false)
  }

  const verifyOtp = async () => {
    setError(''); setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone), token: otp, type: 'sms'
    })
    if (error) { setError('Kod hatalı veya süresi dolmuş.'); setLoading(false); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user!.id).single()

    if (!profile) {
      const role = defaultRole || 'customer'
      await supabase.from('profiles').upsert({ id: data.user!.id, phone: formatPhone(phone), role })
      if (role === 'provider') await supabase.from('provider_profiles').upsert({ id: data.user!.id })
      goTo(role)
    } else {
      goTo(profile.role)
    }
    setLoading(false)
  }

  const goTo = (role: string) => {
    if (role === 'admin') router.replace('/admin')
    else if (role === 'provider') router.replace('/provider')
    else router.replace('/customer')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full font-sans selection:bg-blue-500 selection:text-white bg-slate-50">
      
      {/* Sol Panel - Marka ve Karşılama */}
      <div className="relative lg:w-5/12 bg-gradient-to-br from-blue-600 to-blue-900 px-8 pt-16 pb-12 lg:p-16 text-white flex flex-col justify-center shadow-2xl z-10">
        <button 
          onClick={() => router.back()} 
          className="absolute top-6 lg:top-10 left-6 lg:left-10 text-blue-200 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
        >
          ← Geri Dön
        </button>
        
        <div className="text-7xl lg:text-8xl mb-6 drop-shadow-xl animate-scale-in">
          {defaultRole === 'provider' ? '🔧' : '🏡'}
        </div>
        
        <h1 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight leading-tight">
          {defaultRole === 'provider' ? 'Usta Olarak\nGiriş Yapın' : 'Ev Sahibi Olarak\nGiriş Yapın'}
        </h1>
        
        <p className="text-blue-100/90 text-lg lg:text-xl font-medium max-w-7xl leading-relaxed">
          {step === 'phone'
            ? 'Güvenli giriş yapmak için telefon numaranızı girin. Size tek kullanımlık bir SMS kodu göndereceğiz.'
            : `${phone} numaralı telefona gönderilen 6 haneli doğrulama kodunu girin.`}
        </p>
      </div>

      {/* Sağ Panel - Form Alanı */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-7xl bg-white p-8 lg:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {step === 'phone' ? 'Telefon Numaranız' : 'SMS Kodunu Girin'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {step === 'phone' ? 'Hemen başlamak için numaranızı doğrulayın.' : 'Lütfen mesajlar kutunuzu kontrol edin.'}
            </p>
          </div>

          {step === 'phone' && (
            <div className="animate-slide-up space-y-5">
              <div className="flex gap-3">
                <div className="flex items-center px-4 bg-slate-50 rounded-2xl text-base font-bold text-slate-600 border border-slate-200 shadow-sm">
                  🇹🇷 +90
                </div>
                <input 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg font-medium text-slate-900 shadow-sm placeholder:text-slate-400" 
                  type="tel" 
                  placeholder="5XX XXX XX XX"
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()} 
                  autoFocus 
                />
              </div>
              
              {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
              
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0" 
                onClick={sendOtp} 
                disabled={loading || phone.length < 10}
              >
                {loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder →'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="animate-slide-up space-y-5">
              <input 
                className="w-full text-center text-4xl tracking-[0.4em] font-black py-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 shadow-sm placeholder:text-slate-300"
                type="text" 
                maxLength={6} 
                placeholder="••••••"
                value={otp} 
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()} 
                autoFocus 
              />
              
              {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
              
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0" 
                onClick={verifyOtp} 
                disabled={loading || otp.length < 6}
              >
                {loading ? 'Doğrulanıyor...' : 'Giriş Yap →'}
              </button>
              
              <button 
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 py-3 transition-colors"
              >
                ← Numarayı değiştir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}