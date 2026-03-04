'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider'>(
    'customer'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailConfirmMessage, setEmailConfirmMessage] = useState(false)

  const isProvider = selectedRole === 'provider'

  const register = async () => {
    setError('')
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

    // Profili oluştur / güncelle (trigger ile oluşan satırı rol ile güncelle; email sütunu yoksa sadece role yazılır)
    await supabase
      .from('profiles')
      .upsert({ id: user.id, role: selectedRole }, { onConflict: 'id' })

    if (selectedRole === 'provider') {
      await supabase
        .from('provider_profiles')
        .upsert({ id: user.id }, { onConflict: 'id' })
    }

    // E-posta onayı açıksa session gelmez; kullanıcıya "e-postayı doğrula, sonra giriş yap" de
    const hasSession = !!data.session
    if (!hasSession) {
      setError('')
      setLoading(false)
      setEmailConfirmMessage(true)
      return
    }

    if (selectedRole === 'provider') {
      router.replace('/usta/verify-email')
    } else {
      router.replace('/customer')
    }

    setLoading(false)
  }

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
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="absolute top-6 lg:top-10 left-6 lg:left-10 text-blue-200 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
        >
          ← Girişe Dön
        </button>

        <div className="text-7xl lg:text-8xl mb-6 drop-shadow-xl">
          {isProvider ? '🔧' : '🏡'}
        </div>
        <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight leading-tight">
          {isProvider ? 'Usta Kaydı' : 'Müşteri Kaydı'}
        </h1>
        <p className="text-blue-100/80 text-base font-medium leading-relaxed mb-8">
          Email adresinizle yeni bir hesap oluşturun. Rolünüzü aşağıdan
          seçebilirsiniz.
        </p>

        {/* Rol seçimi */}
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
        <div className="w-full max-w-md bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
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
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && register()}
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
            disabled={loading || !email || password.length < 6 || emailConfirmMessage}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-base font-bold transition-all shadow-lg disabled:opacity-50"
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
  )
}

