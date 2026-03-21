'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

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

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-[15px] text-slate-900 shadow-sm shadow-slate-900/[0.03] outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15'

const labelClass = 'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400'

export default function RegisterPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider'>('customer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailConfirmMessage, setEmailConfirmMessage] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [kvkkAccepted, setKvkkAccepted] = useState(false)

  const isProvider = selectedRole === 'provider'
  const consentOk = termsAccepted && kvkkAccepted

  const canSubmit =
    consentOk &&
    !loading &&
    !!email &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    !emailConfirmMessage

  const register = async () => {
    setError('')
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/login`,
      },
    })

    if (signErr || !data.user) {
      setError(signErr?.message || 'Kayıt oluşturulamadı.')
      setLoading(false)
      return
    }

    const user = data.user

    await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

    const hasSession = !!data.session
    if (!hasSession) {
      setRegisteredEmail(email)
      setPassword('')
      setConfirmPassword('')
      setError('')
      setLoading(false)
      setEmailConfirmMessage(true)
      return
    }

    router.replace('/choose-role')
    setLoading(false)
  }

  const registerWithGoogle = async () => {
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
      setError('Google ile kayıt başarısız: ' + oErr.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#fafbfc] font-sans antialiased lg:flex-row">
      {/* Sol — login ile aynı dil */}
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
            Yeni hesabını birkaç adımda oluştur.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] font-normal leading-relaxed text-white/55">
            Müşteri veya uzman olarak kayıt ol; güvenli doğrulama ve tek panelden yönetim.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center border-b border-slate-200/80 bg-slate-950 px-4 py-4 lg:hidden">
        <p className="text-center text-sm font-medium text-white/90">Kayıt ol</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-12 lg:pl-8 lg:pr-12">
        <div className="w-full max-w-[400px]">
          <AnimatePresence mode="wait">
            {emailConfirmMessage ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-lg shadow-slate-900/[0.06] ring-1 ring-slate-100"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.08 }}
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/25"
                >
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h2 className="font-['Inter',system-ui,sans-serif] text-xl font-semibold tracking-tight text-slate-900">
                  E-postanızı kontrol edin
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-500">
                  <span className="font-medium text-slate-700">{registeredEmail}</span> adresine bir doğrulama bağlantısı gönderdik.
                  Gelen kutunuzu (ve gerekiyorsa spam klasörünü) kontrol edin; ardından giriş yapabilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={() => router.replace('/login')}
                  className="mt-8 h-11 w-full rounded-xl bg-blue-600 text-[14px] font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25"
                >
                  Giriş sayfasına git
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-0"
              >
                <div className="mb-8 lg:mb-9">
                  <h2 className="font-['Inter',system-ui,sans-serif] text-2xl font-semibold tracking-tight text-slate-900">
                    Hesap oluştur
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500">Birkaç bilgiyle başlayın.</p>
                </div>

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
                  onClick={registerWithGoogle}
                  disabled={loading || !consentOk}
                  className="mb-6 flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50/80 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <GoogleIcon />
                  Google ile devam et
                </button>

                <div className="mb-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-slate-400">veya</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="reg-email" className={labelClass}>
                      E-posta
                    </label>
                    <input
                      id="reg-email"
                      className={inputClass}
                      type="email"
                      placeholder="ornek@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-pass" className={labelClass}>
                      Şifre
                    </label>
                    <input
                      id="reg-pass"
                      className={inputClass}
                      type="password"
                      placeholder="En az 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-pass2" className={labelClass}>
                      Şifre tekrar
                    </label>
                    <input
                      id="reg-pass2"
                      className={inputClass}
                      type="password"
                      placeholder="Şifrenizi tekrar girin"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <label className="group flex cursor-pointer gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3.5 transition-colors hover:border-slate-200 hover:bg-slate-50/80">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded-md border-2 border-slate-300 text-blue-600 transition-colors focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0 checked:border-blue-600 checked:bg-blue-600"
                      />
                      <span className="text-left text-[13px] leading-snug text-slate-600">
                        <Link
                          href="/sozlesme"
                          target="_blank"
                          className="font-semibold text-blue-600 underline decoration-blue-600/30 underline-offset-2 transition-colors hover:text-blue-700 hover:decoration-blue-600"
                        >
                          Kullanıcı sözleşmesi
                        </Link>
                        ’ni okudum ve kabul ediyorum.
                      </span>
                    </label>
                    <label className="group flex cursor-pointer gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3.5 transition-colors hover:border-slate-200 hover:bg-slate-50/80">
                      <input
                        type="checkbox"
                        checked={kvkkAccepted}
                        onChange={(e) => setKvkkAccepted(e.target.checked)}
                        className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded-md border-2 border-slate-300 text-blue-600 transition-colors focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0 checked:border-blue-600 checked:bg-blue-600"
                      />
                      <span className="text-left text-[13px] leading-snug text-slate-600">
                        <Link
                          href="/kvkk"
                          target="_blank"
                          className="font-semibold text-blue-600 underline decoration-blue-600/30 underline-offset-2 transition-colors hover:text-blue-700 hover:decoration-blue-600"
                        >
                          KVKK metni
                        </Link>
                        ’ni okudum ve onaylıyorum.
                      </span>
                    </label>
                  </div>

                  {error && (
                    <p className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2.5 text-[13px] text-red-700">{error}</p>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={register}
                      disabled={!canSubmit}
                      className={`group relative h-11 w-full overflow-hidden rounded-xl text-[14px] font-semibold transition-all duration-300 ${
                        canSubmit
                          ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25 hover:from-blue-500 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.99]'
                          : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      {canSubmit && (
                        <span
                          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          style={{
                            background:
                              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                          }}
                        />
                      )}
                      <span className="relative">{loading ? 'Kayıt oluşturuluyor…' : 'Kayıt ol'}</span>
                    </button>
                  </div>

                  <p className="pt-6 text-center text-[13px] text-slate-500">
                    Zaten hesabın var mı?{' '}
                    <button
                      type="button"
                      onClick={() => router.replace('/login')}
                      className="font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Giriş yap
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
