'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Save } from 'lucide-react'

type ProfileDraft = {
  role_type: 'sofor'
  license_class: string
  experience_years: string
  vehicle_types: string[]
  transmission: 'manuel' | 'otomatik' | 'farketmez'
  is_available: boolean
  iban: string
}

function safeParseBio(bio: unknown): any {
  if (typeof bio !== 'string') return null
  try {
    const v = JSON.parse(bio)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

export default function SoforProfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProfileDraft>({
    role_type: 'sofor',
    license_class: 'B',
    experience_years: '1',
    vehicle_types: [],
    transmission: 'farketmez',
    is_available: false,
    iban: '',
  })
  const [vehicleTypesText, setVehicleTypesText] = useState('')

  const vehicleTypes = useMemo(() => {
    const arr = vehicleTypesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    return Array.from(new Set(arr))
  }, [vehicleTypesText])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login?redirect=/sofor/profil')
        return
      }
      setUserId(session.user.id)

      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('id, bio, is_online')
        .eq('id', session.user.id)
        .maybeSingle()

      const bioObj = safeParseBio(pp?.bio)
      const soforObj = bioObj?.sofor && typeof bioObj.sofor === 'object' ? bioObj.sofor : null
      if (soforObj) {
        setDraft((d) => ({
          ...d,
          license_class: typeof soforObj.license_class === 'string' ? soforObj.license_class : d.license_class,
          experience_years: typeof soforObj.experience_years === 'string' ? soforObj.experience_years : d.experience_years,
          vehicle_types: Array.isArray(soforObj.vehicle_types) ? soforObj.vehicle_types.filter((x: any) => typeof x === 'string') : d.vehicle_types,
          transmission: (soforObj.transmission === 'manuel' || soforObj.transmission === 'otomatik' || soforObj.transmission === 'farketmez') ? soforObj.transmission : d.transmission,
          is_available: typeof soforObj.is_available === 'boolean' ? soforObj.is_available : !!pp?.is_online,
          iban: typeof soforObj.iban === 'string' ? soforObj.iban : d.iban,
        }))
        setVehicleTypesText(
          Array.isArray(soforObj.vehicle_types)
            ? soforObj.vehicle_types.filter((x: any) => typeof x === 'string').join(', ')
            : ''
        )
      } else {
        setDraft((d) => ({ ...d, is_available: !!pp?.is_online }))
      }
      setLoading(false)
    }
    load()
  }, [router])

  const save = async () => {
    if (!userId) return
    if (!draft.license_class.trim()) return alert('Ehliyet sınıfı zorunlu.')
    if (!draft.experience_years.trim()) return alert('Tecrübe yılı zorunlu.')
    if (!draft.iban.trim()) return alert('IBAN zorunlu.')

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('provider_profiles')
        .select('id, bio')
        .eq('id', userId)
        .maybeSingle()

      const currentBio = safeParseBio(existing?.bio) ?? {}
      const nextBio = {
        ...currentBio,
        sofor: {
          role_type: 'sofor',
          license_class: draft.license_class.trim(),
          experience_years: draft.experience_years.trim(),
          vehicle_types: vehicleTypes,
          transmission: draft.transmission,
          is_available: !!draft.is_available,
          iban: draft.iban.trim(),
        },
      }

      const { error } = await supabase
        .from('provider_profiles')
        .upsert({
          id: userId,
          bio: JSON.stringify(nextBio),
          is_online: !!draft.is_available,
          is_onboarded: true,
        } as any)

      if (error) throw error
      alert('Profil kaydedildi.')
    } catch (e: any) {
      alert(e?.message || 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">Özel Şoför</p>
        <h1 className="text-lg font-bold text-slate-100">Profil</h1>
        <p className="text-sm text-slate-400 mt-1">Ehliyet, tecrübe ve ödeme bilgilerini güncelle.</p>
      </header>

      <section className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Ehliyet sınıfı</label>
          <input
            value={draft.license_class}
            onChange={(e) => setDraft((d) => ({ ...d, license_class: e.target.value }))}
            className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            placeholder="B"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Tecrübe yılı</label>
          <input
            value={draft.experience_years}
            onChange={(e) => setDraft((d) => ({ ...d, experience_years: e.target.value }))}
            inputMode="numeric"
            className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            placeholder="3"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Kullanabildiği araç tipleri (virgülle)</label>
          <input
            value={vehicleTypesText}
            onChange={(e) => setVehicleTypesText(e.target.value)}
            className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            placeholder="Sedan, SUV, Minibüs"
          />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">Vites tercihi</p>
          <div className="grid grid-cols-3 gap-2">
            {(['manuel', 'otomatik', 'farketmez'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, transmission: v }))}
                className={`py-2.5 rounded-xl border text-xs font-semibold ${
                  draft.transmission === v
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-900/50 text-slate-300 border-indigo-800'
                }`}
              >
                {v === 'manuel' ? 'Manuel' : v === 'otomatik' ? 'Otomatik' : 'Farketmez'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-800 bg-indigo-900/30 p-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">Şu an iş alabilirim</p>
            <p className="text-xs text-slate-500">Müsaitlik durumunu aç/kapat.</p>
          </div>
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, is_available: !d.is_available }))}
            className={`w-14 h-8 rounded-full border transition-colors ${
              draft.is_available ? 'bg-amber-500/30 border-amber-500/40' : 'bg-indigo-900/60 border-indigo-800'
            }`}
            aria-pressed={draft.is_available}
          >
            <span
              className={`block w-6 h-6 rounded-full bg-white transition-transform ${
                draft.is_available ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">IBAN</label>
          <input
            value={draft.iban}
            onChange={(e) => setDraft((d) => ({ ...d, iban: e.target.value }))}
            className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            placeholder="TR00 0000 0000 0000 0000 0000 00"
          />
        </div>
      </section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-amber-500 text-slate-900 font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Kaydet
      </button>
    </div>
  )
}

