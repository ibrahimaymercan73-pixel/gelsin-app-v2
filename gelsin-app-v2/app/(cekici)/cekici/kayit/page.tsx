'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Step = 1 | 2 | 3 | 4 | 5

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

export default function CekiciKayitPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [step, setStep] = useState<Step>(1)

  // Adım 1
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // Adım 2
  const [vehicleType, setVehicleType] = useState<'cekici' | 'kurtarici' | 'flatbed' | null>(null)
  const [plate, setPlate] = useState('')
  const [winchCapacity, setWinchCapacity] = useState('')
  const [hasSlidingBed, setHasSlidingBed] = useState<boolean | null>(null)

  // Adım 3
  const [licenceFile, setLicenceFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)

  // Adım 4
  const [citySearch, setCitySearch] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])

  // Adım 5
  const [iban, setIban] = useState('')

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      setUserId(session.user.id)
      setCheckingSession(false)
    }

    check()
  }, [router])

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase()
    if (!q) return CITIES
    return CITIES.filter((c) => c.toLowerCase().includes(q))
  }, [citySearch])

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    )
  }

  const canNextFromStep = (s: Step) => {
    if (s === 1) {
      return fullName.trim().length > 2 && phone.trim().length >= 10
    }
    if (s === 2) {
      return (
        !!vehicleType &&
        plate.trim().length >= 5 &&
        !!winchCapacity.trim() &&
        hasSlidingBed !== null
      )
    }
    if (s === 3) {
      return !!licenceFile && !!idFile
    }
    if (s === 4) {
      return selectedCities.length > 0
    }
    return true
  }

  const handleNext = () => {
    if (!canNextFromStep(step)) return
    setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev))
  }

  const handlePrev = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))
  }

  const validateIban = (value: string) => {
    const v = value.replace(/\s/g, '').toUpperCase()
    return v.startsWith('TR') && v.length === 26
  }

  const handleSubmit = async () => {
    if (!userId) return
    const cleanIban = iban.replace(/\s/g, '').toUpperCase()
    if (!validateIban(cleanIban)) {
      alert('Geçerli bir IBAN girin (TR ile başlayan, 26 karakter).')
      return
    }
    if (!licenceFile || !idFile) {
      alert('Gerekli belgeleri yükleyin.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      const ts = Date.now()
      const basePath = `cekici/${userId}/${ts}`

      const licencePath = `${basePath}-ruhsa t.${licenceFile.name.split('.').pop() || 'jpg'}`
      const idPath = `${basePath}-ehliyet.${idFile.name.split('.').pop() || 'jpg'}`

      const { error: up1, data: up1Data } = await supabase.storage
        .from('documents')
        .upload(licencePath, licenceFile, { upsert: true })
      if (up1) throw up1

      const { error: up2, data: up2Data } = await supabase.storage
        .from('documents')
        .upload(idPath, idFile, { upsert: true })
      if (up2) throw up2

      const licenceUrl = supabase.storage.from('documents').getPublicUrl(up1Data.path).data
        .publicUrl
      const idUrl = supabase.storage.from('documents').getPublicUrl(up2Data.path).data.publicUrl

      const { error } = await supabase.from('provider_profiles').insert({
        user_id: userId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        service_type: 'cekici',
        status: 'pending',
        vehicle_type: vehicleType,
        plate: plate.trim().toUpperCase(),
        winch_capacity_ton: winchCapacity.trim(),
        has_sliding_bed: hasSlidingBed,
        cities: selectedCities,
        iban: cleanIban,
        documents: {
          ruhsat: licenceUrl,
          ehliyet: idUrl,
        },
      })
      if (error) throw error

      router.replace('/cekici/ustalar')
    } catch (e: any) {
      alert(e?.message || 'Kayıt tamamlanamadı.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  const stepTitle = (s: Step) => {
    if (s === 1) return 'Kişisel Bilgiler'
    if (s === 2) return 'Araç Bilgisi'
    if (s === 3) return 'Belgeler'
    if (s === 4) return 'Hizmet Bölgesi'
    return 'IBAN Bilgisi'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 gap-6">
        {/* Progress */}
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-300">
            Çekici Kaydı
          </p>
          <h1 className="text-lg font-bold">{stepTitle(step)}</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => {
              const active = s === step
              const done = s < step
              return (
                <div key={s} className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${
                      done
                        ? 'bg-emerald-400'
                        : active
                        ? 'bg-amber-400'
                        : 'bg-slate-800'
                    }`}
                    style={{ width: done || active ? '100%' : '0%' }}
                  />
                </div>
              )
            })}
          </div>
        </header>

        {/* Steps */}
        <main className="flex-1 flex flex-col gap-4 text-xs">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-slate-200">Ad Soyad</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  placeholder="Adınız Soyadınız"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-200">Telefon</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  placeholder="05xx xxx xx xx"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-200">
                  Araç Tipi
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'cekici', label: 'Çekici', icon: '🚛' },
                    { key: 'kurtarici', label: 'Kurtarıcı', icon: '🚨' },
                    { key: 'flatbed', label: 'Flatbed', icon: '🛻' },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() =>
                        setVehicleType(v.key as typeof vehicleType)
                      }
                      className={`w-full rounded-2xl px-3 py-3 text-left flex items-center gap-3 border text-xs active:scale-[0.99] transition-transform ${
                        vehicleType === v.key
                          ? 'bg-amber-500/20 border-amber-400/70 text-amber-50'
                          : 'bg-slate-900 border-slate-700 text-slate-100'
                      }`}
                    >
                      <span className="text-lg">{v.icon}</span>
                      <span className="font-medium">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-slate-200">
                    Plaka
                  </label>
                  <input
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 uppercase"
                    placeholder="34 ABC 123"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-200">
                    Vinç Kapasitesi (ton)
                  </label>
                  <input
                    value={winchCapacity}
                    onChange={(e) => setWinchCapacity(e.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Örn: 3"
                  />
                </div>
                <div>
                  <p className="mb-1 text-slate-200">Kayar kasa var mı?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHasSlidingBed(true)}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs border ${
                        hasSlidingBed === true
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                          : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}
                    >
                      Evet
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasSlidingBed(false)}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs border ${
                        hasSlidingBed === false
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                          : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}
                    >
                      Hayır
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-slate-200 text-xs">
                  Ruhsat Fotoğrafı <span className="text-amber-400">*</span>
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setLicenceFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-xs text-slate-300"
                />
              </div>
              <div>
                <p className="mb-1 text-slate-200 text-xs">
                  Ehliyet Fotoğrafı{' '}
                  <span className="text-amber-400">*</span>
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setIdFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-xs text-slate-300"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Belgeler yalnızca doğrulama için kullanılır, üçüncü
                kişilerle paylaşılmaz.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-slate-200">
                  Hizmet Verdiğiniz Şehirler
                </label>
                <input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  placeholder="İl ara..."
                />
              </div>
              <div className="max-h-52 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-2 space-y-1">
                {filteredCities.map((city) => {
                  const selected = selectedCities.includes(city)
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
              {selectedCities.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {selectedCities.map((city) => (
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
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-slate-200">
                  IBAN
                </label>
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
              </div>
              <p className="text-[11px] text-slate-400">
                Ödemeleriniz bu IBAN üzerinden yapılacaktır. Lütfen
                kendi adınıza kayıtlı bir hesap girin.
              </p>
            </div>
          )}
        </main>

        {/* Footer buttons */}
        <footer className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={step === 1 ? () => router.back() : handlePrev}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
          >
            {step === 1 ? 'Vazgeç' : 'Geri'}
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNextFromStep(step)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-xs font-semibold text-slate-950 shadow-md shadow-amber-700/40 disabled:opacity-50"
            >
              İleri
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-xs font-semibold text-emerald-950 shadow-md shadow-emerald-800/40 disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Başvuruyu Gönder
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}


