'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const CITIES = [
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın',
  'Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa',
  'Çanakkale','Çankırı','Çorum',
  'Denizli','Diyarbakır',
  'Edirne','Elazığ','Erzincan','Erzurum','Eskişehir',
  'Gaziantep','Giresun','Gümüşhane',
  'Hakkari','Hatay','Isparta','Mersin',
  'İstanbul','İzmir',
  'Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya',
  'Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde',
  'Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas',
  'Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak',
  'Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman',
  'Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce',
]

export default function CekiciProfilPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  const [vehicleType, setVehicleType] = useState<string>('')
  const [plate, setPlate] = useState<string>('')
  const [capacity, setCapacity] = useState<string>('')
  const [cities, setCities] = useState<string[]>([])
  const [citySearch, setCitySearch] = useState('')
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
        .eq('service_type', 'cekici')
        .maybeSingle()

      if (!data) {
        router.replace('/cekici/kayit')
        return
      }

      setProfile(data)
      setVehicleType(data.vehicle_type || '')
      setPlate(data.plate || '')
      setCapacity(data.winch_capacity_ton || '')
      setCities(Array.isArray(data.cities) ? data.cities : [])
      setIban(data.iban || '')
      setAvailable(!!data.is_available)
      setChecking(false)
    }

    load()
  }, [router])

  const supabase = useMemo(() => createClient(), [])

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase()
    if (!q) return CITIES
    return CITIES.filter((c) => c.toLowerCase().includes(q))
  }, [citySearch])

  const toggleCity = (city: string) => {
    setCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
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
          vehicle_type: vehicleType || null,
          plate: plate || null,
          winch_capacity_ton: capacity || null,
          cities,
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 text-xs">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-amber-300/80">Çekici Usta Profili</p>
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
                : 'bg-slate-900 border-slate-700 text-slate-200'
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
              Araç Bilgileri
            </p>
            <div className="grid grid-cols-1 gap-2">
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="">Seçiniz</option>
                <option value="cekici">Çekici</option>
                <option value="kurtarici">Kurtarıcı</option>
                <option value="flatbed">Flatbed</option>
              </select>
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="Plaka"
              />
              <input
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="Vinç kapasitesi (ton)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-slate-200 text-xs">
              Hizmet Şehirleri
            </p>
            <input
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder="İl ara..."
            />
            <div className="max-h-52 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-2 space-y-1">
              {filteredCities.map((city) => {
                const selected = cities.includes(city)
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleCity(city)}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs ${
                      selected
                        ? 'bg-amber-500/30 text-amber-50'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {city}
                  </button>
                )
              })}
            </div>
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-1 text-[11px]">
                {cities.map((city) => (
                  <span
                    key={city}
                    className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-100"
                  >
                    {city}
                  </span>
                ))}
              </div>
            )}
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
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex justify-around py-2.5 text-[11px]">
          <button
            type="button"
            onClick={() => router.push('/cekici/ustalar')}
            className="flex flex-col items-center gap-0.5 text-slate-300"
          >
            <span>🏠</span>
            <span>İlanlar</span>
          </button>
          <button
            type="button"
            onClick={() =>
              router.push('/cekici/ustalar/tekliflerim')
            }
            className="flex flex-col items-center gap-0.5 text-slate-300"
          >
            <span>📋</span>
            <span>Tekliflerim</span>
          </button>
          <button
            type="button"
            onClick={() =>
              router.push('/cekici/ustalar/profil')
            }
            className="flex flex-col items-center gap-0.5 text-amber-300"
          >
            <span>👤</span>
            <span>Profil</span>
          </button>
        </div>
      </nav>
    </div>
  )
}


