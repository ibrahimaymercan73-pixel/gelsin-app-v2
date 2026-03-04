'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRole = searchParams.get('role') as 'customer' | 'provider' | null

  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider'>(
    urlRole || 'customer'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isProvider = selectedRole === 'provider'

  const goTo = (r: string) => {
    if (r === 'admin') router.replace('/admin')
    else if (r === 'provider') router.replace('/provider')
    else router.replace('/customer')
  }

  const ensureProfileEmail = async (
    userId: string,
    emailValue: string,
    intendedRole: 'customer' | 'provider'
  ) => {
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile) {
      await supabase
        .from('profiles')
        .upsert({ id: userId, email: emailValue, role: intendedRole })
      if (intendedRole === 'provider') {
        await supabase.from('provider_profiles').upsert({ id: userId })
      }
      return intendedRole
    }

    if (!profile.role) {
      await supabase
        .from('profiles')
        .update({ role: intendedRole, email: emailValue })
        .eq('id', userId)
      if (intendedRole === 'provider') {
        await supabase.from('provider_profiles').upsert({ id: userId })
      }
      return intendedRole
    }

    return profile.role as 'customer' | 'provider' | 'admin'
  }

  const loginWithEmail = async () => {
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email veya şifre hatalı. Eğer hesabınız yoksa lütfen kayıt olun.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    // Giriş başarılıysa mevcut role'e göre yönlendir
    const r = await ensureProfileEmail(
      data.user.id,
      email,
      selectedRole // sadece profil boşsa kullanılacak
    )
    if (r === 'provider') {
      router.replace('/provider')
    } else if (r === 'customer') {
      router.replace('/customer')
    } else if (r === 'admin') {
      router.replace('/admin')
    } else {
      router.replace('/role-selection')
    }
    setLoading(false)
  }

  const loginWithGoogle = async () => {
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
      setError('Google ile giriş başarısız: ' + error.message)
      setLoading(false)
    }
  }

  // Google ile giriş sonrası: rol yoksa role-selection'a yönlendir
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !profile.role) {
        router.replace('/role-selection')
      }
    }
    check()
  }, [router])

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full font-sans bg-slate-50">
      {/* SOL PANEL */}
      <div
        className={`relative lg:w-5/12 flex flex-col justify-center px-8 pt-16 pb-12 lg:p-16 text-white ${
          isProvider
            ? 'bg-gradient-to-br from-blue-700 to-blue-950'
            : 'bg-gradient-to-br from-blue-600 to-blue-900'
        }`}
      >
        <div className="text-7xl lg:text-8xl mb-6 drop-shadow-xl">
          {isProvider ? '🔧' : '🏡'}
        </div>
        <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight leading-tight">
          {isProvider ? 'Usta Girişi' : 'Müşteri Girişi'}
        </h1>
        <p className="text-blue-100/80 text-base font-medium leading-relaxed mb-8">
          Google veya email ile güvenli giriş yapın. Rolünüzü daha sonra
          güncelleyebilirsiniz.
        </p>

        {/* Rol değiştir (sadece email/şifre için niyet seçimi) */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all w-fit">
          <button
            type="button"
            onClick={() => setSelectedRole('customer')}
            className={`px-3 py-1 rounded-xl ${
              !isProvider ? 'bg-white text-blue-700' : 'text-blue-100'
            }`}
          >
            🏡 Müşteri
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('provider')}
            className={`px-3 py-1 rounded-xl ${
              isProvider ? 'bg-white text-blue-700' : 'text-blue-100'
            }`}
          >
            🔧 Usta
          </button>
        </div>
      </div>

      {/* SAĞ PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          {/* Google ile giriş */}
          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-3 shadow-sm disabled:opacity-60"
          >
            <span className="text-lg">🟢</span>
            <span>Google ile Devam Et</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400">
              veya email ile devam et
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email / Şifre */}
          <div className="space-y-4 animate-slide-up">
            <div>
              <h2 className="text-2xl font-black text-slate-800">
                Email ile Giriş
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {isProvider
                  ? 'Usta hesabınıza giriş yapın veya yeni usta hesabı oluşturun.'
                  : 'Müşteri hesabınıza giriş yapın veya yeni hesap oluşturun.'}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Email
              </label>
              <input
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
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
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loginWithEmail()}
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={loginWithEmail}
              disabled={loading || !email || password.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-base font-bold transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'İşleniyor...' : 'Giriş Yap →'}
            </button>
            <button
              type="button"
              onClick={() => router.replace('/register')}
              className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 py-2 transition-colors"
            >
              Hesabınız yok mu? Kayıt Ol
            </button>
          </div>
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
