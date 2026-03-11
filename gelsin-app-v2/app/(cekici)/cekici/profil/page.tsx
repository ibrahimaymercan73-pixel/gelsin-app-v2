'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Save } from 'lucide-react'

type ProfileDraft = {
  role_type: 'cekici'
  vehicle_type: string
  plate: string
  capacity: { vinc: boolean; kayar_kasa: boolean }
  service_cities: string[]
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

export default function CekiciProfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProfileDraft>({
    role_type: 'cekici',
    vehicle_type: '',
    plate: '',
    capacity: { vinc: false, kayar_kasa: false },
    service_cities: [],
    iban: '',
  })
  const [citiesText, setCitiesText] = useState('')

  const cities = useMemo(() => {
    const arr = citiesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    return Array.from(new Set(arr))
  }, [citiesText])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login?redirect=/cekici/profil')
        return
      }
      setUserId(session.user.id)
      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('id, bio')
        .eq('id', session.user.id)
        .maybeSingle()

      const bioObj = safeParseBio(pp?.bio)
      const cekiciObj = bioObj?.cekici && typeof bioObj.cekici === 'object' ? bioObj.cekici : null
      if (cekiciObj) {
        setDraft((d) => ({
          ...d,
          vehicle_type: typeof cekiciObj.vehicle_type === 'string' ? cekiciObj.vehicle_type : d.vehicle_type,
          plate: typeof cekiciObj.plate === 'string' ? cekiciObj.plate : d.plate,
          capacity: {
            vinc: !!cekiciObj.capacity?.vinc,
            kayar_kasa: !!cekiciObj.capacity?.kayar_kasa,
          },
          service_cities: Array.isArray(cekiciObj.service_cities) ? cekiciObj.service_cities.filter((x: any) => typeof x === 'string') : d.service_cities,
          iban: typeof cekiciObj.iban === 'string' ? cekiciObj.iban : d.iban,
        }))
        setCitiesText(
          Array.isArray(cekiciObj.service_cities)
            ? cekiciObj.service_cities.filter((x: any) => typeof x === 'string').join(', ')
            : ''
        )
      }
      setLoading(false)
    }
    load()
  }, [router])

  const save = async () => {
    if (!userId) return
    if (!draft.vehicle_type.trim()) return alert('Araç tipi zorunlu.')
    if (!draft.plate.trim()) return alert('Plaka zorunlu.')
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
        cekici: {
          role_type: 'cekici',
          vehicle_type: draft.vehicle_type.trim(),
          plate: draft.plate.trim(),
          capacity: draft.capacity,
          service_cities: cities,
          iban: draft.iban.trim(),
        },
      }

      const { error } = await supabase
        .from('provider_profiles')
        .upsert({
          id: userId,
          bio: JSON.stringify(nextBio),
          service_categories: (Array.isArray((existing as any)?.service_categories) ? (existing as any).service_categories : []) as any,
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
        <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">Çekici</p>
        <h1 className="text-lg font-bold text-slate-100">Profil</h1>
        <p className="text-sm text-slate-400 mt-1">Araç ve ödeme bilgilerini güncelle.</p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Araç tipi</label>
          <input
            value={draft.vehicle_type}
            onChange={(e) => setDraft((d) => ({ ...d, vehicle_type: e.target.value }))}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            placeholder="Örn: Kamyonet + çekici"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Plaka</label>
          <input
            value={draft.plate}
            onChange={(e) => setDraft((d) => ({ ...d, plate: e.target.value }))}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            placeholder="34 ABC 123"
          />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">Kapasite</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, capacity: { ...d.capacity, vinc: !d.capacity.vinc } }))}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${
                draft.capacity.vinc ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              Vinç
            </button>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, capacity: { ...d.capacity, kayar_kasa: !d.capacity.kayar_kasa } }))}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${
                draft.capacity.kayar_kasa ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              Kayar Kasa
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Hizmet bölgesi (şehirler, virgülle)</label>
          <input
            value={citiesText}
            onChange={(e) => setCitiesText(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            placeholder="İstanbul, Kocaeli, Bursa"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">IBAN</label>
          <input
            value={draft.iban}
            onChange={(e) => setDraft((d) => ({ ...d, iban: e.target.value }))}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            placeholder="TR00 0000 0000 0000 0000 0000 00"
          />
        </div>
      </section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-orange-500 text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Kaydet
      </button>
    </div>
  )
}

