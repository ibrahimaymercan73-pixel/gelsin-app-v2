'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ChooseRolePage() {
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
        router.replace('/provider/onboarding')
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
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (!existing) {
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({ id: user.id, role })
        if (insertErr) throw insertErr
      } else {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', user.id)
        if (updateErr) throw updateErr
      }

      if (role === 'provider') {
        await supabase
          .from('provider_profiles')
          .upsert({ id: user.id }, { onConflict: 'id' })
        router.replace('/provider/onboarding')
      } else {
        router.replace('/customer')
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Rol kaydedilemedi.'
      setError(msg)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 font-sans">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <p className="text-3xl font-black text-white tracking-tight mb-2">
            GELSİN<span className="text-slate-400">.</span>
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-4">
            Ne yapmak istiyorsun?
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base max-w-xl mx-auto">
            Hesabının rolünü seç. Bu adım sadece bir kez gösterilir.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium bg-red-500/20 border border-red-400/50 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Müşteri kartı */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => chooseRole('customer')}
            className="relative overflow-hidden rounded-3xl p-6 md:p-7 bg-slate-900 border border-slate-700 hover:border-slate-500 transition-all text-left flex flex-col gap-4 shadow-xl hover:-translate-y-1 disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(248,250,252,0.08),transparent_55%)]" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 text-slate-50 text-2xl">
                🏡
              </div>
              <div className="space-y-1">
                <p className="font-black text-white text-lg md:text-xl">
                  Hizmet Almak İstiyorum
                </p>
                <p className="text-slate-300 text-sm md:text-base">
                  Evimdeki işler için güvenilir ustalar arıyorum.
                </p>
              </div>
            </div>
          </button>

          {/* Usta kartı */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => chooseRole('provider')}
            className="relative overflow-hidden rounded-3xl p-6 md:p-7 bg-slate-900 border border-slate-700 hover:border-slate-500 transition-all text-left flex flex-col gap-4 shadow-xl hover:-translate-y-1 disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(148,163,184,0.16),transparent_55%)]" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 text-slate-50 text-2xl">
                🔧
              </div>
              <div className="space-y-1">
                <p className="font-black text-white text-lg md:text-xl">
                  Hizmet Vermek İstiyorum
                </p>
                <p className="text-slate-300 text-sm md:text-base">
                  Uzmanlık alanımda iş alıp kazanç sağlamak istiyorum.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ChooseRolePage() {
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
        router.replace('/provider/onboarding')
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
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (!existing) {
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({ id: user.id, role })
        if (insertErr) throw insertErr
      } else {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', user.id)
        if (updateErr) throw updateErr
      }

      if (role === 'provider') {
        await supabase
          .from('provider_profiles')
          .upsert({ id: user.id }, { onConflict: 'id' })
        router.replace('/provider/onboarding')
      } else {
        router.replace('/customer')
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Rol kaydedilemedi.'
      setError(msg)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 font-sans">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <p className="text-3xl font-black text-white tracking-tight mb-2">
            GELSİN<span className="text-slate-400">.</span>
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-4">
            Ne yapmak istiyorsun?
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base max-w-xl mx-auto">
            Hesabının rolünü seç. Bu adım sadece bir kez gösterilir.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium bg-red-500/20 border border-red-400/50 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Müşteri kartı */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => chooseRole('customer')}
            className="relative overflow-hidden rounded-3xl p-6 md:p-7 bg-slate-900 border border-slate-700 hover:border-slate-500 transition-all text-left flex flex-col gap-4 shadow-xl hover:-translate-y-1 disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(248,250,252,0.08),transparent_55%)]" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 text-slate-50 text-2xl">
                🏡
              </div>
              <div className="space-y-1">
                <p className="font-black text-white text-lg md:text-xl">
                  Hizmet Almak İstiyorum
                </p>
                <p className="text-slate-300 text-sm md:text-base">
                  Evimdeki işler için güvenilir ustalar arıyorum.
                </p>
              </div>
            </div>
          </button>

          {/* Usta kartı */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => chooseRole('provider')}
            className="relative overflow-hidden rounded-3xl p-6 md:p-7 bg-slate-900 border border-slate-700 hover:border-slate-500 transition-all text-left flex flex-col gap-4 shadow-xl hover:-translate-y-1 disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(148,163,184,0.16),transparent_55%)]" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 text-slate-50 text-2xl">
                🔧
              </div>
              <div className="space-y-1">
                <p className="font-black text-white text-lg md:text-xl">
                  Hizmet Vermek İstiyorum
                </p>
                <p className="text-slate-300 text-sm md:text-base">
                  Uzmanlık alanımda iş alıp kazanç sağlamak istiyorum.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

