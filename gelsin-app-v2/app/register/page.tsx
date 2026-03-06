 'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function GoogleIcon() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-white">
      <svg viewBox="0 0 24 24" className="w-4 h-4">
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

export default function RegisterPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider'>(
    'customer'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailConfirmMessage, setEmailConfirmMessage] = useState(false)

  const isProvider = selectedRole === 'provider'

  const register = async () => {
    setError('')
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/login`,
      },
    })

    if (error || !data.user) {
      setError(error?.message || 'Kayıt oluşturulamadı.')
      setLoading(false)
      return
    }

    const user = data.user

    // Sadece profil satırını oluştur, rolü boş bırak (NULL kalsın)
    await supabase
      .from('profiles')
      .upsert({ id: user.id }, { onConflict: 'id' })

    const hasSession = !!data.session
    if (!hasSession) {
      setError('')
      setLoading(false)
      setEmailConfirmMessage(true)
      return
    }

    // İlk aktif oturumda rolü boş bırak, kullanıcıyı rol seçim ekranına gönder
    router.replace('/choose-role')

    setLoading(false)
  }

  const registerWithGoogle = async () => {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/onboarding`
            : undefined,
      },
    })
    if (error) {
      setError('Google ile kayıt başarısız: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full font-sans bg-slate-50">
      {/* SOL PANEL (login ile aynı) */}
      <div className="relative lg:w-5/12 hidden lg:flex flex-col justify-center px-10 py-16 text-white bg-gradient-to-br from-slate-900 to-slate-800">
        <h1 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight leading-tight">
          Yeni hesabını birkaç adımda oluştur.
        </h1>
        <p className="text-slate-200 text-base font-medium leading-relaxed max-w-md">
          Müşteri veya uzman olarak kayıt olup, işlerinizi tek panelden yönetin.
        </p>
      </div>

      {/* SAĞ PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          {/* Rol sekmesi */}
          <div className="flex w-full rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setSelectedRole('customer')}
              className={`flex-1 px-3 py-2 rounded-xl transition-all ${
                !isProvider
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Müşteri
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('provider')}
              className={`flex-1 px-3 py-2 rounded-xl transition-all ${
                isProvider
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Uzman
            </button>
          </div>

          {/* Google ile kayıt */}
          <button
            type="button"
            onClick={registerWithGoogle}
            disabled={loading}
            className="w-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-3 shadow-sm disabled:opacity-60"
          >
            <GoogleIcon />
            <span>Google ile Devam Et</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400">
              veya email ile kayıt ol
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email / Şifre */}
          <div className="space-y-4 animate-slide-up">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Yeni Hesap Oluştur
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Email ve şifrenizle hızlıca kayıt olabilirsiniz.
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Email
              </label>
              <input
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Şifre
              </label>
              <input
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Şifre (Tekrar)
              </label>
              <input
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
                type="password"
                placeholder="Şifreyi tekrar girin"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {emailConfirmMessage && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 text-sm font-medium">
                Kayıt oluşturuldu. E-posta adresinize gelen doğrulama linkine tıklayın, ardından giriş yapın.
                <button
                  type="button"
                  onClick={() => router.replace('/login')}
                  className="mt-3 block w-full rounded-xl bg-green-600 py-2.5 text-white font-bold hover:bg-green-700"
                >
                  Giriş sayfasına git
                </button>
              </div>
            )}
            {error && (
              <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={register}
              disabled={
                loading ||
                !email ||
                password.length < 6 ||
                confirmPassword.length < 6 ||
                emailConfirmMessage
              }
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl text-base font-bold transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'Kayıt oluşturuluyor...' : 'Kayıt Ol →'}
            </button>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 py-2 transition-colors"
            >
              Zaten hesabın var mı? Giriş Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

