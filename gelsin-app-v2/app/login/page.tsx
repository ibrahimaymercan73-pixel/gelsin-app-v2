'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function GoogleIcon() {
  return (
    <span className="inline-flex h-[18px] w-[18px] items-center justify-center">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
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

/** 6 kutu — yapıştırma ve otomatik odak */
function OtpPinInput({
  value,
  onChange,
  disabled,
  onComplete,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  /** 6 hane dolunca tam kod string ile çağrılır */
  onComplete?: (fullCode: string) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, ' ').slice(0, 6).split('')

  const setAt = (i: number, d: string) => {
    const cur = value.replace(/\D/g, '').slice(0, 6)
    const arr = cur.split('')
    while (arr.length < 6) arr.push('')
    if (d === '') arr[i] = ''
    else arr[i] = d.slice(-1)
    const next = arr.join('').replace(/\D/g, '').slice(0, 6)
    onChange(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
    if (next.length === 6) onComplete?.(next)
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i]?.trim() && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(t)
    const focusI = Math.min(t.length, 5)
    refs.current[focusI]?.focus()
    if (t.length === 6) onComplete?.(t)
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={onPaste}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={digits[i]?.trim() ? digits[i] : ''}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            setAt(i, v)
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="h-11 w-10 rounded-xl border border-slate-200/90 bg-white text-center text-lg font-semibold tabular-nums text-slate-900 outline-none transition-[border-color,box-shadow] placeholder:text-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:opacity-50 sm:h-12 sm:w-11 sm:text-xl"
          aria-label={`Kod ${i + 1}. hane`}
        />
      ))}
    </div>
  )
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

  const loginWithPhoneOtp = async (codeOverride?: string) => {
    setError('')
    const clean = (codeOverride ?? otpCode).replace(/\D/g, '')
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
      const emailVal = data.email as string
      const token = data.token as string
      const supabase = createClient()
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: emailVal,
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

  const sendCodeLabel =
    loading && !codeSent
      ? '…'
      : codeSent && resendSecondsLeft > 0
        ? `${resendSecondsLeft}s`
        : codeSent
          ? 'Tekrar'
          : 'Kod gönder'

  const sendDisabled = loading || !phoneOk || (codeSent && !canResend)

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#fafbfc] font-sans antialiased lg:flex-row">
      {/* —— SOL: koyu, premium —— */}
      <div className="relative hidden min-h-0 flex-col justify-center overflow-hidden px-12 py-14 text-white lg:flex lg:w-[46%] xl:w-[44%]">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0c1929]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-[90px]"
          aria-hidden
        />

        <div className="relative z-[1] max-w-md">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">Gelsin</p>
          <h1 className="text-balance font-['Inter',system-ui,sans-serif] text-4xl font-semibold leading-[1.12] tracking-[-0.03em] text-white xl:text-[2.65rem]">
            Hesabına güvenle giriş yap.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] font-normal leading-relaxed text-white/55">
            Müşteri veya uzman olarak tek panelden işlerini yönet; güvenli oturum, net deneyim.
          </p>
        </div>
      </div>

      {/* Mobil üst şerit */}
      <div className="flex items-center justify-center border-b border-slate-200/80 bg-slate-950 px-4 py-4 lg:hidden">
        <p className="text-center text-sm font-medium text-white/90">Giriş yap</p>
      </div>

      {/* —— SAĞ: form —— */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-12 lg:pl-8 lg:pr-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:mb-9">
            <h2 className="font-['Inter',system-ui,sans-serif] text-2xl font-semibold tracking-tight text-slate-900">
              Hoş geldin
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">Devam etmek için yöntemini seç.</p>
          </div>

          {/* Rol: segmented control + kaydırmalı pill */}
          <div className="relative mb-6 flex h-11 rounded-full bg-slate-200/80 p-1 ring-1 ring-slate-200/60">
            <motion.div
              className="absolute inset-y-1 left-1 z-0 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04]"
              initial={false}
              animate={{ x: isProvider ? 'calc(100% + 4px)' : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            />
            <button
              type="button"
              onClick={() => setSelectedRole('customer')}
              className={`relative z-[1] flex-1 rounded-full py-2 text-[13px] font-medium transition-colors ${
                !isProvider ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Müşteri
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('provider')}
              className={`relative z-[1] flex-1 rounded-full py-2 text-[13px] font-medium transition-colors ${
                isProvider ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Uzman
            </button>
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="mb-6 flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50/80 disabled:opacity-50"
          >
            <GoogleIcon />
            Google ile devam et
          </button>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-slate-400">veya</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Email / Telefon — kompakt pill */}
          <div className="mb-5 inline-flex rounded-full border border-slate-200/90 bg-white p-0.5 shadow-sm shadow-slate-900/[0.02]">
            <button
              type="button"
              onClick={() => setLoginTab('email')}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all ${
                loginTab === 'email'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              E-posta
            </button>
            <button
              type="button"
              onClick={() => setLoginTab('phone')}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all ${
                loginTab === 'phone'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Telefon
            </button>
          </div>

          {loginTab === 'email' ? (
            <div className="space-y-3.5">
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] text-slate-900 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15"
                type="email"
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <div>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] text-slate-900 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15"
                  type="password"
                  placeholder="Şifreniz"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loginWithEmail()}
                  autoComplete="current-password"
                />
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-[12px] font-medium text-blue-600/90 hover:text-blue-700"
                  >
                    Şifremi unuttum
                  </Link>
                </div>
              </div>

              {error && loginTab === 'email' && (
                <p className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-2.5 text-[13px] text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={loginWithEmail}
                disabled={loading || !email || password.length < 6}
                className="mt-1 h-11 w-full rounded-xl bg-blue-600 text-[14px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-45"
              >
                {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Telefon + kod gönder aynı satır */}
              <div className="flex items-stretch gap-2 rounded-xl border border-slate-200 bg-white pl-3.5 ring-0 transition-[border-color,box-shadow] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/15">
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="05xx xxx xx xx"
                  value={phoneDisplay}
                  onChange={(e) => setPhoneDisplay(formatPhoneInputDisplay(e.target.value))}
                />
                <div className="flex shrink-0 items-center border-l border-slate-100 pr-1">
                  <button
                    type="button"
                    onClick={sendPhoneOtp}
                    disabled={sendDisabled}
                    className="rounded-lg px-2.5 py-2 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {sendCodeLabel}
                  </button>
                </div>
              </div>

              {error && loginTab === 'phone' && (
                <p className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-2.5 text-[13px] text-red-700">
                  {error}
                </p>
              )}

              {codeSent && (
                <div className="space-y-4 pt-1">
                  <p className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    SMS ile gelen kod
                  </p>
                  <OtpPinInput
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={loading}
                    onComplete={(full) => void loginWithPhoneOtp(full)}
                  />
                  <button
                    type="button"
                    onClick={() => void loginWithPhoneOtp()}
                    disabled={loading || otpCode.replace(/\D/g, '').length !== 6}
                    className="h-11 w-full rounded-xl bg-blue-600 text-[14px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-45"
                  >
                    {loading ? 'Doğrulanıyor…' : 'Giriş yap'}
                  </button>
                  {canResend && codeSent && (
                    <p className="text-center text-[12px] text-slate-500">
                      Kod gelmedi mi?{' '}
                      <button
                        type="button"
                        onClick={sendPhoneOtp}
                        disabled={loading || !phoneOk}
                        className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40"
                      >
                        Yeniden gönder
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="mt-8 text-center text-[13px] text-slate-500">
            Hesabın yok mu?{' '}
            <button
              type="button"
              onClick={() => router.replace('/register')}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Kayıt ol
            </button>
          </p>
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
