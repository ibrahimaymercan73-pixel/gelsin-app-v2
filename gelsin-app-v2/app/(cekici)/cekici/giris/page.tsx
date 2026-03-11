'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

type Tab = 'login' | 'register'

export default function CekiciGirisPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createHizmetlerClient()

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.replace('/cekici/ustalar')
    } catch (e: any) {
      alert(e?.message || 'Giriş yapılamadı.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!fullName.trim() || !email || !password) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      const userId = data.user?.id
      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: fullName.trim(),
          role: 'provider',
          service_type: 'cekici',
        } as any)
      }
      router.replace('/cekici/ustalar')
    } catch (e: any) {
      alert(e?.message || 'Kayıt tamamlanamadı.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (tab === 'login') {
      await handleLogin()
    } else {
      await handleRegister()
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-8 gap-6">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-3xl">
            🚛
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-amber-300">
              Çekici Ustası
            </p>
            <h1 className="text-xl font-bold mt-1">Giriş / Kayıt</h1>
          </div>
        </header>

        <div className="flex rounded-full bg-slate-900 border border-slate-700 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-full ${
              tab === 'login'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300'
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-full ${
              tab === 'register'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          {tab === 'register' && (
            <div>
              <label className="block mb-1 text-slate-200">
                Ad Soyad
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="Adınız Soyadınız"
              />
            </div>
          )}
          <div>
            <label className="block mb-1 text-slate-200">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder="ornek@mail.com"
            />
          </div>
          <div>
            <label className="block mb-1 text-slate-200">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold shadow-md shadow-amber-700/40 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-auto">
          Bu ekran sadece çekici ustaları içindir. Müşteri girişi ana
          giriş ekranından yapılmalıdır.
        </p>
      </div>
    </div>
  )
}

