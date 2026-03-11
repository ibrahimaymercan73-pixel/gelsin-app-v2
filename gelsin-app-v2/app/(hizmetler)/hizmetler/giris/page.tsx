'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

type Tab = 'login' | 'register'

export default function HizmetlerGirisPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showChoices, setShowChoices] = useState(false)

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
      setShowChoices(true)
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
          role: 'customer',
          service_type: 'hizmet_customer',
        } as any)
      }
      setShowChoices(true)
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

  if (showChoices) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 gap-6">
          <header className="flex justify-center">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/30">
                G
              </div>
              <span className="text-xl font-semibold tracking-[0.25em] uppercase text-slate-100">
                GELSİN
              </span>
            </div>
          </header>

          <main className="flex-1 flex flex-col gap-4">
            <Link
              href="/cekici/yeni"
              className="w-full rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-slate-950 p-5 shadow-lg shadow-orange-500/30 flex flex-col items-start gap-2 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚛</span>
                <div className="flex flex-col items-start">
                  <span className="text-base font-semibold">Çekici Çağır</span>
                  <span className="text-xs font-medium text-amber-950/90">
                    Aracınız arızalandı mı? Hemen çekici çağırın
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href="/sofor/yeni"
              className="w-full rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-slate-900 text-slate-50 p-5 shadow-lg shadow-indigo-800/40 flex flex-col items-start gap-2 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👨‍✈️</span>
                <div className="flex flex-col items-start">
                  <span className="text-base font-semibold">Şoför Çağır</span>
                  <span className="text-xs text-slate-200/80">
                    Güvenli yolculuk için onaylı özel şoför
                  </span>
                </div>
              </div>
            </Link>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 gap-6">
        <header className="flex justify-center">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/30">
              G
            </div>
            <span className="text-xl font-semibold tracking-[0.25em] uppercase text-slate-100">
              GELSİN
            </span>
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
      </div>
    </div>
  )
}

