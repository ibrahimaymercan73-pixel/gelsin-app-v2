'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRole = searchParams.get('role') as 'customer' | 'provider' | null

  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider' | null>(urlRole)
  const [method, setMethod] = useState<'sms' | 'email'>('sms')
  const [step, setStep] = useState<'role' | 'phone' | 'otp' | 'form'>(urlRole ? 'phone' : 'role')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const role = selectedRole || 'customer'
  const isProvider = role === 'provider'

  const formatPhone = (p: string) => {
    const d = p.replace(/\D/g, '')
    if (d.startsWith('0')) return '+90' + d.slice(1)
    if (d.startsWith('90')) return '+' + d
    if (d.startsWith('+')) return p
    return '+90' + d
  }

  const goTo = (r: string) => {
    if (r === 'admin') router.replace('/admin')
    else if (r === 'provider') router.replace('/provider')
    else router.replace('/customer')
  }

  const ensureProfile = async (userId: string, phoneOrEmail: string) => {
    const supabase = createClient()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!profile) {
      await supabase.from('profiles').upsert({ id: userId, phone: phoneOrEmail, role })
      if (role === 'provider') await supabase.from('provider_profiles').upsert({ id: userId })
      return role
    }
    return profile.role
  }

  const sendOtp = async () => {
    setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ phone: formatPhone(phone) })
    if (error) setError('SMS gönderilemedi: ' + error.message)
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
    const r = await ensureProfile(data.user!.id, formatPhone(phone))
    goTo(r)
    setLoading(false)
  }

  const loginWithEmail = async () => {
    setError(''); setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email veya şifre hatalı.')
      } else {
        const { data: signUp, error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
        if (signUp.user) {
          const r = await ensureProfile(signUp.user.id, email)
          goTo(r)
        }
      }
      setLoading(false)
      return
    }
    const r = await ensureProfile(data.user.id, email)
    goTo(r)
    setLoading(false)
  }

  // ── ROL SEÇİM EKRANI ──
  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <p className="text-3xl font-black text-white italic tracking-tighter mb-2">
              GELSİN<span className="text-blue-400">.</span>
            </p>
            <h1 className="text-2xl lg:text-3xl font-black text-white mt-4">Nasıl devam etmek istersiniz?</h1>
            <p className="text-slate-400 mt-2 text-sm">Hesap türünüzü seçin</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => { setSelectedRole('customer'); setStep('phone') }}
              className="w-full bg-white hover:bg-blue-50 border-2 border-white hover:border-blue-300 rounded-3xl p-6 flex items-center gap-5 transition-all group text-left shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform">🏡</div>
              <div>
                <p className="font-black text-slate-800 text-lg">Müşteri Olarak Gir</p>
                <p className="text-slate-400 text-sm mt-0.5">Usta bul, iş talebi oluştur</p>
              </div>
              <span className="ml-auto text-slate-300 text-2xl">→</span>
            </button>

            <button
              onClick={() => { setSelectedRole('provider'); setStep('phone') }}
              className="w-full bg-blue-600 hover:bg-blue-500 border-2 border-blue-500 rounded-3xl p-6 flex items-center gap-5 transition-all group text-left shadow-xl shadow-blue-600/30 hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform">🔧</div>
              <div>
                <p className="font-black text-white text-lg">Usta Olarak Gir</p>
                <p className="text-blue-200 text-sm mt-0.5">İş ilanlarını gör, teklif ver</p>
              </div>
              <span className="ml-auto text-blue-200 text-2xl">→</span>
            </button>
          </div>

          <button onClick={() => router.back()} className="w-full text-center text-slate-500 hover:text-slate-300 text-sm font-bold mt-8 py-3 transition-colors">
            ← Geri Dön
          </button>
        </div>
      </div>
    )
  }

  // ── GİRİŞ EKRANI ──
  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full font-sans bg-slate-50">

      {/* SOL PANEL */}
      <div className={`relative lg:w-5/12 flex flex-col justify-center px-8 pt-16 pb-12 lg:p-16 text-white ${
        isProvider ? 'bg-gradient-to-br from-blue-700 to-blue-950' : 'bg-gradient-to-br from-blue-600 to-blue-900'
      }`}>
        <button onClick={() => { setStep('role'); setError('') }}
          className="absolute top-6 lg:top-10 left-6 lg:left-10 text-blue-200 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors">
          ← Geri
        </button>

        <div className="text-7xl lg:text-8xl mb-6 drop-shadow-xl">{isProvider ? '🔧' : '🏡'}</div>
        <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight leading-tight">
          {isProvider ? 'Usta Girişi' : 'Müşteri Girişi'}
        </h1>
        <p className="text-blue-100/80 text-base font-medium leading-relaxed mb-8">
          {method === 'sms'
            ? step === 'phone' ? 'Telefon numaranızı girin, SMS kodu gönderelim.' : `${phone} numarasına kod gönderdik.`
            : isProvider ? 'Usta hesabınızla giriş yapın.' : 'Müşteri hesabınızla giriş yapın.'}
        </p>

        {/* Rol değiştir */}
        <button
          onClick={() => { setStep('role'); setError('') }}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all w-fit"
        >
          {isProvider ? '🏡' : '🔧'} {isProvider ? 'Müşteri olarak gir' : 'Usta olarak gir'}
        </button>

        {/* Yöntem Seçici */}
        <div className="mt-6 flex gap-3">
          <button onClick={() => { setMethod('sms'); setError('') }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all border ${
              method === 'sms' ? 'bg-white text-blue-700 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}>
            📱 SMS
          </button>
          <button onClick={() => { setMethod('email'); setError('') }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all border ${
              method === 'email' ? 'bg-white text-blue-700 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}>
            ✉️ Email
          </button>
        </div>
      </div>

      {/* SAĞ PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-slate-100">

          {/* SMS - Telefon */}
          {method === 'sms' && step === 'phone' && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Telefon Numaranız</h2>
                <p className="text-slate-400 text-sm mt-1">SMS doğrulama kodu gönderilecek</p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center px-4 bg-slate-50 rounded-2xl text-base font-bold text-slate-600 border border-slate-200 shrink-0">
                  🇹🇷 +90
                </div>
                <input
                  className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-medium text-slate-900 placeholder:text-slate-300"
                  type="tel" placeholder="5XX XXX XX XX"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()} autoFocus
                />
              </div>
              {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
              <button onClick={sendOtp} disabled={loading || phone.length < 10}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-base font-bold transition-all shadow-lg disabled:opacity-50">
                {loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder →'}
              </button>
            </div>
          )}

          {/* SMS - OTP */}
          {method === 'sms' && step === 'otp' && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <h2 className="text-2xl font-black text-slate-800">SMS Kodunu Girin</h2>
                <p className="text-slate-400 text-sm mt-1">{phone} numarasına gönderildi</p>
              </div>
              <input
                className="w-full text-center text-4xl tracking-[0.4em] font-black py-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-200"
                type="text" maxLength={6} placeholder="••••••"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()} autoFocus
              />
              {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
              <button onClick={verifyOtp} disabled={loading || otp.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-base font-bold transition-all shadow-lg disabled:opacity-50">
                {loading ? 'Doğrulanıyor...' : 'Giriş Yap →'}
              </button>
              <button onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 py-2 transition-colors">
                ← Numarayı değiştir
              </button>
            </div>
          )}

          {/* EMAIL */}
          {method === 'email' && (
            <div className="space-y-5 animate-slide-up">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Email ile Giriş</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {isProvider ? 'Usta hesabınıza giriş yapın' : 'Müşteri hesabınıza giriş yapın'}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Email</label>
                <input
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
                  type="email" placeholder="ornek@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Şifre</label>
                <input
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
                  type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loginWithEmail()}
                />
              </div>
              {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
              <button onClick={loginWithEmail} disabled={loading || !email || password.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-base font-bold transition-all shadow-lg disabled:opacity-50">
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
              </button>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1">📌 Hesap oluşturmak için:</p>
                <p className="text-xs text-amber-600 leading-relaxed">
                  Supabase → Authentication → Users → <strong>Add user</strong> → email + şifre girin. Sonra profiles tablosuna ID'yi ekleyip <strong>role</strong> alanını <strong>{isProvider ? 'provider' : 'customer'}</strong> yapın.
                </p>
              </div>
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
