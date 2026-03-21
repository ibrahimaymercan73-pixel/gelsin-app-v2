'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function GoogleIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-white">
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M21.35 11.1H12v2.9h5.35c-.24 1.5-.98 2.77-2.09 3.62v3h3.38c1.98-1.83 3.11-4.53 3.11-7.72 0-.74-.07-1.45-.2-2.13Z"
          fill="#4285F4"
        />
        <path
          d="M12 22c2.7 0 4.96-.89 6.61-2.38l-3.38-3c-.94.63-2.14 1-3.23 1-2.48 0-4.6-1.67-5.35-3.93H3.2v3.06C4.82 19.98 8.12 22 12 22Z"
          fill="#34A853"
        />
        <path
          d="M6.65 13.69C6.46 13.06 6.35 12.39 6.35 11.7c0-.68.12-1.35.3-1.98V6.66H3.2C2.58 7.9 2.25 9.27 2.25 10.7c0 1.44.33 2.8.95 4.04l3.45-1.05Z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.34c1.47 0 2.78.51 3.82 1.5l2.86-2.86C17 2.89 14.7 2 12 2 8.12 2 4.82 4.02 3.2 6.66l3.45 3.06C7.4 7.01 9.52 5.34 12 5.34Z"
          fill="#EA4335"
        />
      </svg>
    </span>
  )
}

function formatPhoneInputDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRole = searchParams.get('role') as 'customer' | 'provider' | null
  const redirectTo = searchParams.get('redirect') || ''

  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider'>(urlRole || 'customer')
  const [loginTab, setLoginTab] = useState<'email' | 'phone'>('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phoneDisplay, setPhoneDisplay] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isProvider = selectedRole === 'provider'

  const ensureProfileEmail = async (
    supabaseInstance: ReturnType<typeof createClient>,
    userId: string
  ) => {
    const { data: profile } = await supabaseInstance.from('profiles').select('role').eq('id', userId).single()

    if (!profile) {
      await supabaseInstance.from('profiles').upsert({ id: userId }, { onConflict: 'id' })
      return null
    }

    return (profile.role as 'customer' | 'provider' | 'admin' | null) ?? null
  }

  const navigateAfterSession = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Oturum oluşturulamadı.')
        setLoading(false)
        return
      }

      const r = await ensureProfileEmail(supabase, user.id)
      if (!r) {
        router.replace('/choose-role')
      } else {
        const allowedRedirect =
          redirectTo &&
          redirectTo.startsWith('/') &&
          !redirectTo.startsWith('//') &&
          ((r === 'customer' && redirectTo.startsWith('/customer')) ||
            (r === 'provider' && redirectTo.startsWith('/provider')) ||
            (r === 'admin' && redirectTo.startsWith('/admin')))
        const target = allowedRedirect
          ? redirectTo
          : r === 'provider'
            ? '/provider'
            : r === 'customer'
              ? '/customer'
              : '/admin'
        router.replace(target)
      }
      setLoading(false)
    },
    [redirectTo, router]
  )

  const loginWithEmail = async () => {
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { data, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signErr) {
      if (signErr.message.includes('Invalid login credentials')) {
        setError('Email veya şifre hatalı. Eğer hesabınız yoksa lütfen kayıt olun.')
      } else {
        setError(signErr.message)
      }
      setLoading(false)
      return
    }

    const r = await ensureProfileEmail(supabase, data.user.id)
    if (!r) {
      router.replace('/choose-role')
    } else {
      const allowedRedirect =
        redirectTo &&
        redirectTo.startsWith('/') &&
        !redirectTo.startsWith('//') &&
        ((r === 'customer' && redirectTo.startsWith('/customer')) ||
          (r === 'provider' && redirectTo.startsWith('/provider')) ||
          (r === 'admin' && redirectTo.startsWith('/admin')))
      const target = allowedRedirect
        ? redirectTo
        : r === 'provider'
          ? '/provider'
          : r === 'customer'
            ? '/customer'
            : '/admin'
      router.replace(target)
    }
    setLoading(false)
  }

  const loginWithGoogle = async () => {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: oErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/onboarding` : undefined,
      },
    })
    if (oErr) {
      setError('Google ile giriş başarısız: ' + oErr.message)
      setLoading(false)
    }
  }

  const sendPhoneOtp = async () => {
    setError('')
    const digits = phoneDisplay.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Lütfen geçerli bir cep telefonu girin.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDisplay, role: selectedRole }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Kod gönderilemedi.')
        setLoading(false)
        return
      }
      setCodeSent(true)
      setOtpCode('')
      setResendSecondsLeft(45)
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.')
    }
    setLoading(false)
  }

  const loginWithPhoneOtp = async () => {
    setError('')
    const clean = otpCode.replace(/\D/g, '')
    if (clean.length !== 6) {
      setError('6 haneli doğrulama kodunu girin.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDisplay, code: clean, role: selectedRole }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Doğrulama başarısız.')
        setLoading(false)
        return
      }
      const email = data.email as string
      const token = data.token as string
      const supabase = createClient()
      const { error: vErr } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'magiclink',
      })
      if (vErr) {
        setError(vErr.message || 'Oturum açılamadı.')
        setLoading(false)
        return
      }
      await navigateAfterSession(supabase)
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.')
      setLoading(false)
    }
  }

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

      if (!profile || !profile.role) {
        router.replace('/choose-role')
      }
    }
    check()
  }, [router])

  useEffect(() => {
    setCodeSent(false)
    setOtpCode('')
    setError('')
    setResendSecondsLeft(0)
  }, [selectedRole, loginTab])

  useEffect(() => {
    if (resendSecondsLeft <= 0) return
    const t = window.setTimeout(() => {
      setResendSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearTimeout(t)
  }, [resendSecondsLeft])

  const canResend = resendSecondsLeft === 0
  const phoneDigits = phoneDisplay.replace(/\D/g, '')
  const phoneOk = phoneDigits.length === 11 && phoneDigits.startsWith('0') && phoneDigits[1] === '5'

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 font-sans lg:flex-row">
      {/* SOL PANEL */}
      <div className="relative hidden flex-col justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-10 py-16 text-white lg:flex lg:w-5/12">
        <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight lg:text-5xl">
          Hesabına güvenle giriş yap.
        </h1>
        <p className="max-w-md text-base font-medium leading-relaxed text-slate-200">
          Müşteri veya uzman olarak kayıt olup, işlerini tek panelden yönet.
        </p>
      </div>

      {/* SAĞ PANEL */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm lg:p-10">
          {/* Rol sekmesi */}
          <div className="flex w-full rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setSelectedRole('customer')}
              className={`flex-1 rounded-xl px-3 py-2 transition-all ${
                !isProvider ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Müşteri
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('provider')}
              className={`flex-1 rounded-xl px-3 py-2 transition-all ${
                isProvider ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Uzman
            </button>
          </div>

          {/* Google ile giriş */}
          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            <GoogleIcon />
            <span>Google ile Devam Et</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400">veya e-posta / telefon ile</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Email | Telefon sekmeleri */}
          <div className="flex w-full rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setLoginTab('email')}
              className={`flex-1 rounded-xl px-3 py-2 transition-all ${
                loginTab === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginTab('phone')}
              className={`flex-1 rounded-xl px-3 py-2 transition-all ${
                loginTab === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Telefon
            </button>
          </div>

          {loginTab === 'email' ? (
            <div className="animate-slide-up space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Email ile Giriş</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {isProvider
                    ? 'Uzman hesabınıza giriş yapın veya yeni uzman hesabı oluşturun.'
                    : 'Müşteri hesabınıza giriş yapın veya yeni hesap oluşturun.'}
                </p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Email
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-800"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Şifre
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-800"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loginWithEmail()}
                />
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:underline">
                    Şifremi Unuttum
                  </Link>
                </div>
              </div>
              {error && loginTab === 'email' && (
                <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={loginWithEmail}
                disabled={loading || !email || password.length < 6}
                className="w-full rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'İşleniyor...' : 'Giriş Yap →'}
              </button>
            </div>
          ) : (
            <div className="animate-slide-up space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Telefon ile Giriş</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {isProvider
                    ? 'Kayıtlı uzman cep telefonunuza SMS ile doğrulama kodu gönderilir.'
                    : 'Kayıtlı müşteri cep telefonunuza SMS ile doğrulama kodu gönderilir.'}
                </p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Cep telefonu
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-medium tracking-wide text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-800"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="05xx xxx xx xx"
                  value={phoneDisplay}
                  onChange={(e) => setPhoneDisplay(formatPhoneInputDisplay(e.target.value))}
                />
              </div>
              <button
                type="button"
                onClick={sendPhoneOtp}
                disabled={loading || !phoneOk || (codeSent && !canResend)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading && !codeSent
                  ? 'Gönderiliyor...'
                  : codeSent && resendSecondsLeft > 0
                    ? `Kod gönderildi (${resendSecondsLeft}s)`
                    : 'Kod Gönder'}
              </button>
              {error && loginTab === 'phone' && (
                <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}
              {codeSent && (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                      6 haneli kod
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center text-2xl font-bold tracking-[0.35em] text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-800"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => e.key === 'Enter' && otpCode.replace(/\D/g, '').length === 6 && loginWithPhoneOtp()}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loginWithPhoneOtp}
                    disabled={loading || otpCode.replace(/\D/g, '').length !== 6}
                    className="w-full rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loading ? 'İşleniyor...' : 'Giriş Yap →'}
                  </button>
                  {codeSent && canResend && (
                    <button
                      type="button"
                      onClick={sendPhoneOtp}
                      disabled={loading || !phoneOk}
                      className="w-full py-2 text-sm font-semibold text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Kodu tekrar gönder
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => router.replace('/register')}
            className="w-full py-2 text-center text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
          >
            Hesabınız yok mu? Kayıt Ol
          </button>
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
