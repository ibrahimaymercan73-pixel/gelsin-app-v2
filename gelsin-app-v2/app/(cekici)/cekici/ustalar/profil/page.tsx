'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Save } from 'lucide-react'

type Meta = {
  type?: string
  vehicle?: {
    vehicleType?: string
    plate?: string
    craneTons?: number | null
    hasSlidingBed?: boolean | null
  }
  serviceCities?: string[]
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

export default function CekiciUstaProfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [fullName, setFullName] = useState<string>('') // sadece gösterim
  const [isAvailable, setIsAvailable] = useState(false) // provider_profiles.is_online

  const [vehicleType, setVehicleType] = useState('cekici')
  const [plate, setPlate] = useState('')
  const [craneTons, setCraneTons] = useState('')
  const [hasSlidingBed, setHasSlidingBed] = useState<boolean | null>(null)
  const [cities, setCities] = useState('')
  const [iban, setIban] = useState('')

  const canSave = useMemo(() => {
    return plate.trim().length >= 5 && iban.trim().length >= 10
  }, [plate, iban])

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login?redirect=/cekici/ustalar/profil')
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
    const v = meta?.vehicle
    if (v?.vehicleType) setVehicleType(String(v.vehicleType))
    if (v?.plate) setPlate(String(v.plate))
    if (typeof v?.craneTons === 'number') setCraneTons(String(v.craneTons))
    if (typeof v?.hasSlidingBed === 'boolean') setHasSlidingBed(v.hasSlidingBed)
    if (Array.isArray(meta?.serviceCities)) setCities(meta!.serviceCities!.join(', '))
    if (meta?.iban) setIban(String(meta.iban))

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const meta: Meta = {
        type: 'cekici_profile',
        vehicle: {
          vehicleType,
          plate: plate.trim().toUpperCase(),
          craneTons: Number(String(craneTons).replace(',', '.')) || null,
          hasSlidingBed,
        },
        serviceCities: cities
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">Profil</p>
            <p className="text-base font-bold truncate">{fullName || 'Usta'}</p>
          </div>
          <button
            type="button"
            onClick={toggleAvailability}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
              isAvailable
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isAvailable ? 'İş alabilirim' : 'Müsait değilim'}
          </button>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-200">Araç Bilgileri</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'cekici', label: 'Çekici' },
              { id: 'kurtarici', label: 'Kurtarıcı' },
              { id: 'flatbed', label: 'Flatbed' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicleType(v.id)}
                className={`px-3 py-3 rounded-2xl border text-sm font-semibold ${
                  vehicleType === v.id
                    ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                    : 'border-slate-800 bg-slate-950/30 text-slate-300'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Plaka</label>
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              placeholder="34 ABC 123"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vinç kapasitesi (ton)</label>
              <input
                value={craneTons}
                onChange={(e) => setCraneTons(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                placeholder="3"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kayar kasa</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasSlidingBed(true)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${
                    hasSlidingBed === true
                      ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                      : 'border-slate-800 bg-slate-950/30 text-slate-300'
                  }`}
                >
                  Evet
                </button>
                <button
                  type="button"
                  onClick={() => setHasSlidingBed(false)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${
                    hasSlidingBed === false
                      ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                      : 'border-slate-800 bg-slate-950/30 text-slate-300'
                  }`}
                >
                  Hayır
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">Hizmet Şehirleri</p>
          <input
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            placeholder="İstanbul, Kocaeli, Sakarya"
          />
          <p className="text-xs text-slate-500">Virgülle ayır.</p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">IBAN</p>
          <input
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            placeholder="TR..."
          />
        </section>

        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur border-t border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-around text-xs font-semibold">
          <a href="/cekici/ustalar" className="text-slate-300">🏠 İlanlar</a>
          <a href="/cekici/ustalar/tekliflerim" className="text-slate-300">📋 Tekliflerim</a>
          <a href="/cekici/ustalar/profil" className="text-orange-400">👤 Profil</a>
        </div>
      </nav>
    </div>
  )
}

