'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const check = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true)
      })
    }
    check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true)
    })
    const t = setTimeout(check, 800)
    return () => {
      subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    toast.success('Şifreniz başarıyla değiştirildi.')
    router.replace('/login')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-slate-500 text-sm">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Yeni şifre belirle</h1>
        <p className="text-slate-500 text-sm mb-6">
          Hesabınız için yeni bir şifre girin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Yeni şifre
            </label>
            <input
              type="password"
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Şifre (tekrar)
            </label>
            <input
              type="password"
              placeholder="Şifreyi tekrar girin"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
              required
              minLength={6}
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl text-base font-bold transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
          </button>
        </form>
      </div>
    </div>
  )
}
