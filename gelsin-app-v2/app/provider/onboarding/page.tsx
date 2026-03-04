'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const CATEGORY_OPTIONS = [
  { slug: 'painting', label: 'Boya & Badana', icon: '🎨', desc: 'Daire boyama, tamirat, alçı, tadilat' },
  { slug: 'plumbing', label: 'Su Tesisatı', icon: '🚰', desc: 'Musluk, gider, petek ve tesisat işleri' },
  { slug: 'electric', label: 'Elektrik', icon: '⚡', desc: 'Elektrik arızaları, aydınlatma, sigorta' },
  { slug: 'carpentry', label: 'Marangoz', icon: '🪚', desc: 'Dolap, kapı, laminat, ahşap işler' },
  { slug: 'cleaning', label: 'Temizlik', icon: '🧹', desc: 'Ev, ofis, boş daire, inşaat sonrası' },
  { slug: 'assembly', label: 'Montaj', icon: '🔩', desc: 'Mobilya, TV, avize, beyaz eşya montajı' },
] as const

export default function ProviderOnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/onboarding')
        return
      }

      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('service_categories, is_onboarded')
        .eq('id', user.id)
        .single()

      const cats = (pp?.service_categories as string[] | null) ?? []
      setSelected(cats)
      setLoading(false)
    }

    load()
  }, [router])

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    )
  }

  const save = async () => {
    if (selected.length === 0) {
      alert('Lütfen en az bir uzmanlık alanı seçin.')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/onboarding')
      return
    }

    const { error } = await supabase
      .from('provider_profiles')
      .update({
        service_categories: selected,
        is_onboarded: true,
      })
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      alert('Kaydedilemedi: ' + error.message)
      return
    }

    router.replace('/provider')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#F4F7FA]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F4F7FA] flex flex-col">
      <header className="px-6 lg:px-10 pt-10 pb-4 border-b border-slate-200/60 bg-white">
        <p className="text-xs font-bold text-sky-500 uppercase tracking-[0.25em]">
          Usta Onboarding
        </p>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 mt-2">
          Hangi işlerde uzmansın?
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 mt-2 max-w-2xl">
          Seçeceğin kategoriler, müşterilerin seni hangi alanlarda bulacağını
          belirler. İstediğin zaman profilinden güncelleyebilirsin.
        </p>
      </header>

      <main className="flex-1 px-6 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORY_OPTIONS.map((cat) => {
              const active = selected.includes(cat.slug)
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => toggle(cat.slug)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 ${
                    active
                      ? 'border-sky-500 bg-sky-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{cat.icon}</span>
                    {active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white">
                        Seçili
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {cat.label}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {cat.desc}
                  </p>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full max-w-md mx-auto mt-4 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-sky-600/25 disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
          </button>
        </div>
      </main>
    </div>
  )
}

