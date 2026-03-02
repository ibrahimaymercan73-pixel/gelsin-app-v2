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
    <div className="min-h-dvh flex flex-col max-w-md mx-auto">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 pt-16 pb-10 text-white">
        <button onClick={() => router.back()} className="text-blue-200 text-sm mb-6 flex items-center gap-1">
          ← Geri
        </button>
        <div className="text-5xl mb-4">{defaultRole === 'provider' ? '🔧' : '🏡'}</div>
        <h1 className="text-2xl font-black">
          {step === 'phone' ? 'Telefon Numaranız' : 'SMS Kodu'}
        </h1>
        <p className="text-blue-200 text-sm mt-1">
          {step === 'phone'
            ? 'Güvenli giriş için SMS kodu göndereceğiz'
            : `${phone} numarasına gönderildi`}
        </p>
      </div>

      <div className="flex-1 bg-white px-6 py-8 space-y-4 max-w-md w-full mx-auto">
        {step === 'phone' && (
          <div className="animate-slide-up space-y-4">
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-gray-100 rounded-xl text-sm font-bold text-gray-600 whitespace-nowrap border border-gray-200">
                🇹🇷 +90
              </div>
              <input className="input flex-1" type="tel" placeholder="5XX XXX XX XX"
                value={phone} onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOtp()} autoFocus />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
            <button className="btn-primary" onClick={sendOtp} disabled={loading || phone.length < 10}>
              {loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder →'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="animate-slide-up space-y-4">
            <input className="input text-center text-4xl tracking-[0.5em] font-bold py-6"
              type="text" maxLength={6} placeholder="••••••"
              value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && verifyOtp()} autoFocus />
            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
            <button className="btn-primary" onClick={verifyOtp} disabled={loading || otp.length < 6}>
              {loading ? 'Doğrulanıyor...' : 'Giriş Yap →'}
            </button>
            <button onClick={() => { setStep('phone'); setOtp(''); setError('') }}
              className="w-full text-center text-sm text-gray-400 py-2">
              ← Numarayı değiştir
            </button>
          </div>
        )}
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
