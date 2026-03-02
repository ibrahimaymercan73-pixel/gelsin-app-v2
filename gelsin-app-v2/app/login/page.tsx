'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') as 'customer' | 'provider' | null

  const [method, setMethod] = useState<'sms' | 'email'>('sms')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatPhone = (p: string) => {
    const d = p.replace(/\D/g, '')
    if (d.startsWith('0')) return '+90' + d.slice(1)
    if (d.startsWith('90')) return '+' + d
    if (d.startsWith('+')) return p
    return '+90' + d
  }

  const goTo = (role: string) => {
    if (role === 'admin') router.replace('/admin')
    else if (role === 'provider') router.replace('/provider')
    else router.replace('/customer')
  }

  const ensureProfile = async (userId: string, phoneOrEmail: string) => {
    const supabase = createClient()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!profile) {
      const role = defaultRole || 'customer'
      await supabase.from('profiles').upsert({ id: userId, phone: phoneOrEmail, role })
      if (role === 'provider') await supabase.from('provider_profiles').upsert({ id: userId })
      return role
    }
    return profile.role
  }

  // SMS AKIŞI
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
    const role = await ensureProfile(data.user!.id, formatPhone(phone))
    goTo(role)
    setLoading(false)
  }

  // EMAIL AKIŞI
  const loginWithEmail = async () => {
    setError(''); setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Kullanıcı yoksa kayıt ol
      if (error.message.includes('Invalid login')) {
        setError('Email veya şifre hatalı.')
      } else {
        const { data: signUp, error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
        if (signUp.user) {
          const role = await ensureProfile(signUp.user.id, email)
          goTo(role)
        }
      }
      setLoading(false)
      return
    }
    const role = await ensureProfile(data.user.id, email)
    goTo(role)
    setLoading(false)
  }

  const isProvider = defaultRole === 'provider'

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full font-sans bg-slate-50">

      {/* SOL PANEL */}
      <div className="relative lg:w-5/12 bg-gradient-to-br from-blue-600 to-blue-900 px-8 pt-16 pb-12 lg:p-16 text-white flex flex-col justify-center">
        <button onClick={() => router.back()}
          className="absolute top-6 lg:top-10 left-6 lg:left-10 text-blue-200 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors">
          ← Geri Dön
        </button>

        <div className="text-7xl lg:text-8xl mb-6 drop-shadow-xl animate-scale-in">
          {isProvider ? '🔧' : '🏡'}
        </div>
        <h1 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight leading-tight whitespace-pre-line">
          {isProvider ? 'Usta Olarak\nGiriş Yapın' : 'Hoş Geldiniz'}
        </h1>
        <p className="text-blue-100/90 text-lg font-medium leading-relaxed">
          {method === 'sms'
            ? step === 'phone'
              ? 'Güvenli giriş için telefon numaranızı girin.'
              : `${phone} numarasına SMS kodu gönderdik.`
            : 'Email ve şifrenizle hızlıca giriş yapın.'}
        </p>

        {/* Yöntem Seçici */}
        <div className="mt-10 flex gap-3">
          <button onClick={() => { setMethod('sms'); setError('') }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all border ${
              method === 'sms' ? 'bg-white text-blue-700 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}>
            📱 SMS ile Giriş
          </button>
          <button onClick={() => { setMethod('email'); setError('') }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all border ${
              method === 'email' ? 'bg-white text-blue-700 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}>
            ✉️ Email ile Giriş
          </button>
        </div>
      </div>

      {/* SAĞ PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-slate-100">

          {/* SMS FORMU */}
          {method === 'sms' && step === 'phone' && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Telefon Numaranız</h2>
                <p className="text-slate-400 text-sm mt-1">SMS doğrulama kodu gönderilecek</p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center px-4 bg-slate-50 rounded-2xl text-base font-bold text-slate-600 border border-slate-200">
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

          {/* EMAIL FORMU */}
          {method === 'email' && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Email ile Giriş</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {isProvider ? 'Usta hesabınıza giriş yapın' : 'Müşteri hesabınıza giriş yapın'}
                </p>
              </div>

              <div className="space-y-3">
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
              </div>

              {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}

              <button onClick={loginWithEmail} disabled={loading || !email || password.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-base font-bold transition-all shadow-lg shadow-blue-200 disabled:opacity-50">
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
              </button>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-500 mb-2">📌 İlk defa mı giriyorsunuz?</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Supabase panelinden Authentication → Users → "Add user" ile email+şifre oluşturun. Ardından o kullanıcının ID'sini profiles tablosuna manuel ekleyip role alanını <strong>provider</strong> veya <strong>admin</strong> yapın.
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
