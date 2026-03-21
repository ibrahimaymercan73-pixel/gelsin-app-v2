'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import {
  AuthFormCard,
  AuthGoogleButton,
  AuthLeftPanel,
  AuthMobileBar,
  AuthPageBackground,
  AuthPrimaryButton,
  AuthSegmented,
  authInputClass,
  authLabelClass,
} from '@/components/auth/AuthSurfaces'

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

    await supabase.from('profiles').upsert({ id: user.id, role: selectedRole }, { onConflict: 'id' })

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
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('gelsin_register_role', selectedRole)
      } catch {
        /* ignore */
      }
    }
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

  return (
    <AuthPageBackground>
      <AuthLeftPanel
        eyebrow="Gelsin"
        title="Yeni hesabını birkaç adımda oluştur."
        subtitle="Müşteri veya uzman — güvenli doğrulama, tek panel."
      />
      <AuthMobileBar label="Kayıt" />

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-14 lg:pl-10 lg:pr-14">
        <div className="w-full max-w-[420px]">
          <AnimatePresence mode="wait">
            {emailConfirmMessage ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <AuthFormCard>
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.05 }}
                    className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.5)]"
                  >
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900">E-postanı kontrol et</h2>
                  <p className="mt-3 text-center text-[14px] leading-relaxed text-slate-500">
                    <span className="font-medium text-slate-800">{registeredEmail}</span> adresine doğrulama bağlantısı gönderdik.
                  </p>
                  <div className="mt-8">
                    <AuthPrimaryButton onClick={() => router.replace('/login')}>Giriş sayfasına git</AuthPrimaryButton>
                  </div>
                </AuthFormCard>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AuthFormCard>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">Kayıt ol</h2>

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
                      onClick={registerWithGoogle}
                      disabled={loading || !consentOk}
                      label="Google ile devam et"
                    />
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="reg-email" className={authLabelClass}>
                        E-posta
                      </label>
                      <input
                        id="reg-email"
                        className={authInputClass}
                        type="email"
                        placeholder="ornek@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-pass" className={authLabelClass}>
                        Şifre
                      </label>
                      <input
                        id="reg-pass"
                        className={authInputClass}
                        type="password"
                        placeholder="En az 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-pass2" className={authLabelClass}>
                        Şifre tekrar
                      </label>
                      <input
                        id="reg-pass2"
                        className={authInputClass}
                        type="password"
                        placeholder="Tekrar girin"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="flex cursor-pointer gap-3 rounded-lg bg-slate-100/60 px-3 py-3 transition-colors hover:bg-slate-100/90">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 h-[17px] w-[17px] shrink-0 cursor-pointer rounded border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/35 checked:bg-slate-900 checked:ring-slate-900"
                        />
                        <span className="text-left text-[13px] leading-snug text-slate-600">
                          <Link
                            href="/sozlesme"
                            target="_blank"
                            className="font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Kullanıcı sözleşmesi
                          </Link>
                          ’ni okudum.
                        </span>
                      </label>
                      <label className="flex cursor-pointer gap-3 rounded-lg bg-slate-100/60 px-3 py-3 transition-colors hover:bg-slate-100/90">
                        <input
                          type="checkbox"
                          checked={kvkkAccepted}
                          onChange={(e) => setKvkkAccepted(e.target.checked)}
                          className="mt-0.5 h-[17px] w-[17px] shrink-0 cursor-pointer rounded border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/35 checked:bg-slate-900 checked:ring-slate-900"
                        />
                        <span className="text-left text-[13px] leading-snug text-slate-600">
                          <Link href="/kvkk" target="_blank" className="font-semibold text-blue-600 hover:text-blue-700">
                            KVKK metni
                          </Link>
                          ’ni onaylıyorum.
                        </span>
                      </label>
                    </div>

                    {error && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
                    )}

                    <div className="pt-2">
                      <AuthPrimaryButton onClick={register} disabled={!canSubmit}>
                        {loading ? 'Kayıt oluşturuluyor…' : 'Kayıt ol'}
                      </AuthPrimaryButton>
                    </div>

                    <p className="pt-6 text-center text-[13px] text-slate-500">
                      Zaten hesabın var mı?{' '}
                      <button
                        type="button"
                        onClick={() => router.replace('/login')}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        Giriş yap
                      </button>
                    </p>
                  </div>
                </AuthFormCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AuthPageBackground>
  )
}
