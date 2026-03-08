'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RoleSelectionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'customer') {
        router.replace('/customer')
        return
      }

      if (profile?.role === 'provider') {
        router.replace('/choose-role')
        return
      }

      if (profile?.role === 'admin') {
        router.replace('/admin')
        return
      }

      setLoading(false)
    }

    load()
  }, [router])

  const chooseRole = async (role: 'customer' | 'provider') => {
    setError('')
    setSubmitting(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      setSubmitting(false)
      return
    }

    try {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({ id: user.id, role }, { onConflict: 'id' })
      if (upsertErr) throw upsertErr

      if (role === 'provider') {
        await supabase
          .from('provider_profiles')
          .upsert({ id: user.id }, { onConflict: 'id' })
        router.replace('/choose-role')
      } else {
        router.replace('/customer')
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Rol kaydedilemedi.'
      setError(msg)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-6 font-sans">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <p className="text-3xl font-black text-white italic tracking-tighter mb-2">
            GELSİN<span className="text-blue-400">.</span>
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-4">
            Nasıl devam etmek istersiniz?
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Hesabınız için rol seçin. İstediğiniz zaman değiştirebilirsiniz.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium bg-red-500/20 border border-red-400/50 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => chooseRole('customer')}
            className="bg-white hover:bg-blue-50 border-2 border-white hover:border-blue-300 rounded-3xl p-6 flex flex-col gap-4 transition-all group text-left shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform">
                🏡
              </div>
              <div>
                <p className="font-black text-slate-800 text-lg">
                  Hizmet Almak İstiyorum
                </p>
                <p className="text-slate-500 text-sm mt-0.5">
                  Uzman bul, iş talebi oluştur, teklifleri karşılaştır.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => chooseRole('provider')}
            className="bg-blue-600 hover:bg-blue-500 border-2 border-blue-500 rounded-3xl p-6 flex flex-col gap-4 transition-all group text-left shadow-xl shadow-blue-600/30 hover:-translate-y-1 disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform">
                🔧
              </div>
              <div>
                <p className="font-black text-white text-lg">
                  Hizmet Vermek İstiyorum
                </p>
                <p className="text-blue-100 text-sm mt-0.5">
                  İş ilanlarını gör, teklif ver, profil puanınla öne çık.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

