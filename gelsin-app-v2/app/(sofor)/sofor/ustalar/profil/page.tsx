'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Save } from 'lucide-react'

type Meta = {
  type?: string
  license?: { class?: string; year?: number | null }
  preferences?: { vehicleTypes?: string[]; transmission?: string; note?: string }
  iban?: string
}

function safeParse(bio: string | null): Meta | null {
  if (!bio) return null
  try {
    const obj = JSON.parse(bio)
    return obj && typeof obj === 'object' ? (obj as Meta) : null
  } catch {
    return null
  }
}

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Minibüs', 'Kamyonet'] as const

export default function SoforUstaProfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [fullName, setFullName] = useState<string>('')
  const [isAvailable, setIsAvailable] = useState(false) // provider_profiles.is_online

  const [licenseClass, setLicenseClass] = useState('B')
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([])
  const [transmission, setTransmission] = useState<'manuel' | 'otomatik' | 'her_ikisi' | ''>('')
  const [iban, setIban] = useState('')

  const canSave = useMemo(() => {
    return licenseClass.trim().length >= 1 && vehicleTypes.length >= 1 && transmission !== '' && iban.trim().length >= 10
  }, [licenseClass, vehicleTypes.length, transmission, iban])

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login?redirect=/sofor/ustalar/profil')
      return
    }
    const uid = session.user.id
    setUserId(uid)

    const { data: p } = await supabase.from('profiles').select('full_name').eq('id', uid).single()
    setFullName(String(p?.full_name || '').trim())

    const { data: pp } = await supabase
      .from('provider_profiles')
      .select('bio, is_online')
      .eq('id', uid)
      .single()

    setIsAvailable(!!pp?.is_online)
    const meta = safeParse(pp?.bio ?? null)
    if (meta?.license?.class) setLicenseClass(String(meta.license.class))
    if (Array.isArray(meta?.preferences?.vehicleTypes)) setVehicleTypes(meta!.preferences!.vehicleTypes!)
    if (meta?.preferences?.transmission) setTransmission(meta.preferences.transmission as any)
    if (meta?.iban) setIban(String(meta.iban))

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleVehicleType = (v: string) => {
    setVehicleTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  const toggleAvailability = async () => {
    if (!userId) return
    const next = !isAvailable
    setIsAvailable(next)
    const supabase = createClient()
    const { error } = await supabase.from('provider_profiles').update({ is_online: next } as any).eq('id', userId)
    if (error) {
      setIsAvailable(!next)
      alert(error.message)
    }
  }

  const save = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const meta: Meta = {
        type: 'sofor_profile',
        license: { class: licenseClass.trim().toUpperCase() },
        preferences: { vehicleTypes, transmission },
        iban: iban.trim().replace(/\s+/g, ''),
      }
      const { error } = await supabase
        .from('provider_profiles')
        .upsert({ id: userId, bio: JSON.stringify(meta), is_online: isAvailable } as any)
      if (error) throw error
      alert('Kaydedildi.')
    } catch (e: any) {
      alert(e?.message || 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 pb-28">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">Profil</p>
            <p className="text-base font-bold truncate">{fullName || 'Usta'}</p>
          </div>
          <button
            type="button"
            onClick={toggleAvailability}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
              isAvailable
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-indigo-900/80 text-slate-200 border-indigo-800'
            }`}
          >
            {isAvailable ? 'İş alabilirim' : 'Müsait değilim'}
          </button>
        </header>

        <section className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">Ehliyet</p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Ehliyet sınıfı</label>
            <input
              value={licenseClass}
              onChange={(e) => setLicenseClass(e.target.value)}
              className="w-full rounded-xl bg-indigo-950/40 border border-indigo-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder="B"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">Araç Tercihleri</p>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_TYPES.map((v) => {
              const active = vehicleTypes.includes(v)
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleVehicleType(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    active
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                      : 'border-indigo-800 bg-indigo-950/30 text-slate-300'
                  }`}
                >
                  {v}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { id: 'manuel', label: 'Manuel' },
              { id: 'otomatik', label: 'Otomatik' },
              { id: 'her_ikisi', label: 'Her ikisi' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTransmission(t.id as any)}
                className={`px-3 py-3 rounded-2xl border text-sm font-semibold ${
                  transmission === t.id
                    ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                    : 'border-indigo-800 bg-indigo-950/30 text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-800 bg-indigo-900/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">IBAN</p>
          <input
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            className="w-full rounded-xl bg-indigo-950/40 border border-indigo-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            placeholder="TR..."
          />
        </section>

        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className="w-full py-3.5 rounded-2xl bg-amber-500 text-slate-900 font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-indigo-950/90 backdrop-blur border-t border-indigo-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-around text-xs font-semibold">
          <a href="/sofor/ustalar" className="text-slate-200">🏠 İlanlar</a>
          <a href="/sofor/ustalar/tekliflerim" className="text-slate-200">📋 Tekliflerim</a>
          <a href="/sofor/ustalar/profil" className="text-amber-400">👤 Profil</a>
        </div>
      </nav>
    </div>
  )
}

