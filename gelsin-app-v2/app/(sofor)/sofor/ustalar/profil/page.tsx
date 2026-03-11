'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function SoforProfilPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  const [licenceClass, setLicenceClass] = useState<string>('')
  const [vehiclePrefs, setVehiclePrefs] = useState<string[]>([])
  const [gearType, setGearType] = useState<'manuel' | 'otomatik' | 'herikisi'>(
    'herikisi'
  )
  const [iban, setIban] = useState<string>('')
  const [available, setAvailable] = useState(false)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const { data } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('service_type', 'sofor')
        .maybeSingle()

      if (!data) {
        router.replace('/sofor/kayit')
        return
      }

      setProfile(data)
      setLicenceClass(data.licence_class || '')
      setVehiclePrefs(
        Array.isArray(data.vehicle_preferences)
          ? data.vehicle_preferences
          : []
      )
      setGearType(
        (data.gear_type as 'manuel' | 'otomatik' | 'herikisi') ||
          'herikisi'
      )
      setIban(data.iban || '')
      setAvailable(!!data.is_available)
      setChecking(false)
    }

    load()
  }, [router])

  const supabase = useMemo(() => createClient(), [])

  const toggleVehiclePref = (v: string) => {
    setVehiclePrefs((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
  }

  const validateIban = (value: string) => {
    const v = value.replace(/\s/g, '').toUpperCase()
    return v.startsWith('TR') && v.length === 26
  }

  const saveProfile = async () => {
    if (!profile) return
    const cleanIban = iban.replace(/\s/g, '').toUpperCase()
    if (cleanIban && !validateIban(cleanIban)) {
      alert('Geçerli bir IBAN girin (TR ile başlayan, 26 karakter).')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({
          licence_class: licenceClass || null,
          vehicle_preferences: vehiclePrefs,
          gear_type: gearType,
          iban: cleanIban || null,
          is_available: available,
        })
        .eq('id', profile.id)
      if (error) throw error
      alert('Profiliniz güncellendi.')
    } catch (e: any) {
      alert(e?.message || 'Profil güncellenemedi.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = () => {
    setAvailable((prev) => !prev)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-indigo-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 text-xs">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-indigo-200/80">
              Şoför Profili
            </p>
            <h1 className="text-lg font-semibold">
              {profile?.full_name || 'Profilim'}
            </h1>
          </div>
          <button
            type="button"
            onClick={toggleAvailable}
            className={`relative inline-flex items-center h-8 px-1 rounded-full text-[11px] border ${
              available
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                : 'bg-indigo-900 border-indigo-700 text-slate-200'
            }`}
          >
            <span
              className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                available ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
            <span className="ml-2 pr-2">
              Şu an iş alabilirim
            </span>
          </button>
        </header>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="font-semibold text-slate-200 text-xs">
              Ehliyet ve Araç Tercihleri
            </p>
            <div className="space-y-2">
              <select
                value={licenceClass}
                onChange={(e) => setLicenceClass(e.target.value)}
                className="w-full rounded-xl bg-indigo-900 border border-indigo-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="">Ehliyet sınıfı</option>
                <option value="B">B</option>
                <option value="E">E</option>
                <option value="D">D</option>
              </select>
              <div>
                <p className="mb-1 text-slate-200 text-xs">
                  Kullanabileceğiniz Araçlar
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'sedan', label: 'Sedan' },
                    { key: 'suv', label: 'SUV' },
                    { key: 'minibus', label: 'Minibüs' },
                    { key: 'ticari', label: 'Ticari' },
                  ].map((v) => {
                    const selected = vehiclePrefs.includes(v.key)
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => toggleVehiclePref(v.key)}
                        className={`px-3 py-1.5 rounded-full text-[11px] border ${
                          selected
                            ? 'bg-indigo-500/40 border-indigo-300 text-white'
                            : 'bg-indigo-900 border-indigo-700 text-slate-200'
                        }`}
                      >
                        {v.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1 text-slate-200 text-xs">
                  Vites Tercihi
                </p>
                <div className="flex gap-2">
                  {[
                    { key: 'manuel', label: 'Manuel' },
                    { key: 'otomatik', label: 'Otomatik' },
                    { key: 'herikisi', label: 'Her ikisi' },
                  ].map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() =>
                        setGearType(g.key as typeof gearType)
                      }
                      className={`flex-1 rounded-xl px-3 py-2 text-xs border ${
                        gearType === g.key
                          ? 'bg-indigo-500/30 border-indigo-300 text-white'
                          : 'bg-indigo-900 border-indigo-700 text-slate-100'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-slate-200 text-xs">
              IBAN
            </p>
            <input
              value={iban}
              onChange={(e) =>
                setIban(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                )
              }
              className="w-full rounded-xl bg-indigo-900 border border-indigo-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="TRxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="text-[11px] text-slate-400">
              Ödemeler bu IBAN üzerinden yapılacaktır.
            </p>
          </div>
        </section>

        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-emerald-500 text-emerald-950 text-xs font-semibold shadow-md shadow-emerald-900/40 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Kaydet
        </button>
      </div>

      {/* Alt Nav */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-indigo-800 bg-indigo-950/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex justify-around py-2.5 text-[11px]">
          <button
            type="button"
            onClick={() => router.push('/sofor/ustalar')}
            className="flex flex-col items-center gap-0.5 text-slate-300"
          >
            <span>🏠</span>
            <span>İlanlar</span>
          </button>
          <button
            type="button"
            onClick={() =>
              router.push('/sofor/ustalar/tekliflerim')
            }
            className="flex flex-col items-center gap-0.5 text-slate-300"
          >
            <span>📋</span>
            <span>Tekliflerim</span>
          </button>
          <button
            type="button"
            onClick={() =>
              router.push('/sofor/ustalar/profil')
            }
            className="flex flex-col items-center gap-0.5 text-indigo-100"
          >
            <span>👤</span>
            <span>Profil</span>
          </button>
        </div>
      </nav>
    </div>
  )
}


