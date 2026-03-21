'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'
import {
  AuthFormCard,
  AuthGoogleButton,
  AuthLeftPanel,
  AuthMobileBar,
  AuthPageBackground,
  AuthPrimaryButton,
  AuthSegmented,
  authInputClass,
} from '@/components/auth/AuthSurfaces'

function formatPhoneInputDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
}

const otpCellClass =
  'h-10 w-9 rounded-lg border-0 bg-slate-100/90 text-center text-[15px] font-semibold tabular-nums text-slate-900 outline-none transition-[background-color,box-shadow] focus:bg-white focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 sm:w-10'

function OtpPinInput({
  value,
  onChange,
  disabled,
  onComplete,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
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
    if (e.key === 'Backspace' && !digits[i]?.trim() && i > 0) refs.current[i - 1]?.focus()
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
    <div className="flex justify-center gap-1.5 sm:gap-2" onPaste={onPaste}>
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
          className={otpCellClass}
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
        setError('E-posta veya şifre hatalı.')
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
      setError(oErr.message)
      setLoading(false)
    }
  }

  const sendPhoneOtp = async () => {
    setError('')
    const digits = phoneDisplay.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Geçerli bir cep numarası girin.')
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
      setError('Bağlantı hatası.')
    }
    setLoading(false)
  }

  const loginWithPhoneOtp = async (codeOverride?: string) => {
    setError('')
    const clean = (codeOverride ?? otpCode).replace(/\D/g, '')
    if (clean.length !== 6) {
      setError('6 haneli kodu girin.')
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
      setError('Bağlantı hatası.')
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
    loading && !codeSent ? '…' : codeSent && resendSecondsLeft > 0 ? `${resendSecondsLeft}s` : codeSent ? 'Tekrar' : 'Gönder'
  const sendDisabled = loading || !phoneOk || (codeSent && !canResend)

  return (
    <AuthPageBackground>
      <AuthLeftPanel
        eyebrow="Gelsin"
        title="Hesabına güvenle giriş yap."
        subtitle="Müşteri veya uzman — tek panel, güvenli oturum."
      />
      <AuthMobileBar label="Giriş" />

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-14 lg:pl-10 lg:pr-14">
        <AuthFormCard>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Giriş yap</h2>

          <div className="mt-6">
            <AuthSegmented
              value={isProvider ? 'provider' : 'customer'}
              onChange={(id) => setSelectedRole(id as 'customer' | 'provider')}
              options={[
                { id: 'customer', label: 'Müşteri' },
                { id: 'provider', label: 'Uzman' },
              ]}
            />
          </div>

          <div className="mt-5">
            <AuthGoogleButton
              onClick={loginWithGoogle}
              disabled={loading}
              label="Google ile devam et"
            />
          </div>

          <div className="mt-6">
            <AuthSegmented
              value={loginTab}
              onChange={(id) => setLoginTab(id as 'email' | 'phone')}
              options={[
                { id: 'email', label: 'E-posta' },
                { id: 'phone', label: 'Telefon' },
              ]}
            />
          </div>

          <div className="mt-6">
            {loginTab === 'email' ? (
              <div className="space-y-3">
                <input
                  className={authInputClass}
                  type="email"
                  placeholder="E-posta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  className={authInputClass}
                  type="password"
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loginWithEmail()}
                  autoComplete="current-password"
                />
                <div className="text-right">
                  <Link href="/forgot-password" className="text-[12px] font-medium text-blue-600 hover:text-blue-700">
                    Şifremi unuttum
                  </Link>
                </div>
                {error && loginTab === 'email' && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
                )}
                <div className="pt-1">
                  <AuthPrimaryButton
                    onClick={loginWithEmail}
                    disabled={loading || !email || password.length < 6}
                  >
                    {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
                  </AuthPrimaryButton>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-stretch overflow-hidden rounded-lg bg-slate-100/90 ring-1 ring-transparent transition-[background-color,box-shadow] focus-within:bg-white focus-within:ring-blue-500/30">
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="05xx xxx xx xx"
                    value={phoneDisplay}
                    onChange={(e) => setPhoneDisplay(formatPhoneInputDisplay(e.target.value))}
                  />
                  <div className="flex shrink-0 items-center border-l border-slate-200/80 pr-1">
                    <button
                      type="button"
                      onClick={sendPhoneOtp}
                      disabled={sendDisabled}
                      className="rounded-md px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {sendCodeLabel}
                    </button>
                  </div>
                </div>
                {error && loginTab === 'phone' && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
                )}
                {codeSent && (
                  <div className="space-y-4">
                    <OtpPinInput
                      value={otpCode}
                      onChange={setOtpCode}
                      disabled={loading}
                      onComplete={(full) => void loginWithPhoneOtp(full)}
                    />
                    <AuthPrimaryButton
                      onClick={() => void loginWithPhoneOtp()}
                      disabled={loading || otpCode.replace(/\D/g, '').length !== 6}
                    >
                      {loading ? 'Doğrulanıyor…' : 'Giriş yap'}
                    </AuthPrimaryButton>
                    {canResend && codeSent && (
                      <p className="text-center text-[12px] text-slate-500">
                        <button
                          type="button"
                          onClick={sendPhoneOtp}
                          disabled={loading || !phoneOk}
                          className="font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
                        >
                          Kodu yeniden gönder
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-[13px] text-slate-500">
            Hesabın yok mu?{' '}
            <button
              type="button"
              onClick={() => router.replace('/register')}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Kayıt ol
            </button>
          </p>
        </AuthFormCard>
      </div>
    </AuthPageBackground>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
