'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setLoading(true)
    const supabase = createClient()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/update-password`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Girişe dön
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Şifremi Unuttum</h1>
        <p className="text-slate-500 text-sm mb-6">
          Kayıtlı e-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
        </p>

        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 text-sm font-medium mb-4">
            E-posta gönderildi. Lütfen <strong>{email}</strong> adresinize gelen linke tıklayıp yeni şifrenizi belirleyin.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                E-posta
              </label>
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none text-base font-medium text-slate-900 placeholder:text-slate-300"
                required
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
              {loading ? 'Gönderiliyor...' : 'Sıfırlama linki gönder'}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-4 block text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          Giriş sayfasına dön
        </Link>
      </div>
    </div>
  )
}
