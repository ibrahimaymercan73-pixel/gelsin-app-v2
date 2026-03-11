'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Car,
  Truck,
  Bus,
  Bike,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
} from 'lucide-react'

type VehicleType = 'sedan' | 'suv' | 'minibus' | 'motosiklet' | 'kamyonet'
type Transmission = 'manuel' | 'otomatik'

const VEHICLE_OPTIONS: { id: VehicleType; label: string; icon: React.ReactNode }[] = [
  { id: 'sedan', label: 'Sedan', icon: <Car className="w-8 h-8" /> },
  { id: 'suv', label: 'SUV', icon: <Car className="w-8 h-8" /> },
  { id: 'minibus', label: 'Minibüs', icon: <Bus className="w-8 h-8" /> },
  { id: 'motosiklet', label: 'Motosiklet', icon: <Bike className="w-8 h-8" /> },
  { id: 'kamyonet', label: 'Kamyonet', icon: <Truck className="w-8 h-8" /> },
]

const STEPS = ['Araç Bilgisi', 'Arıza Durumu', 'Konum']

export default function CekiciYeniPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)

  // Adım 1
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null)
  const [transmission, setTransmission] = useState<Transmission | null>(null)

  // Adım 2
  const [wheelsTurn, setWheelsTurn] = useState<boolean | null>(null)
  const [gearboxLocked, setGearboxLocked] = useState<boolean | null>(null)
  const [vehicleInDitch, setVehicleInDitch] = useState<boolean | null>(null)
  const [note, setNote] = useState('')
  const [photoFiles, setPhotoFiles] = useState<[File | null, File | null]>([null, null])
  const [photoPreviews, setPhotoPreviews] = useState<[string | null, string | null]>([null, null])

  // Adım 3
  const [currentAddress, setCurrentAddress] = useState('')
  const [currentLat, setCurrentLat] = useState<number | null>(null)
  const [currentLng, setCurrentLng] = useState<number | null>(null)
  const [fetchingLocation, setFetchingLocation] = useState(false)
  const [destinationAddress, setDestinationAddress] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [categoryId, setCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?redirect=/cekici/yeni')
        return
      }
      setAuthChecked(true)
    }
    check()
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('service_categories')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (data?.id) setCategoryId(data.id)
    }
    load()
  }, [authChecked])

  const handlePhotoChange = (index: 0 | 1, file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreviews((p) => {
        if (p[index]) URL.revokeObjectURL(p[index]!)
        const next: [string | null, string | null] = [...p]
        next[index] = url
        return next
      })
      setPhotoFiles((f) => {
        const next: [File | null, File | null] = [...f]
        next[index] = file
        return next
      })
    } else {
      setPhotoPreviews((p) => {
        if (p[index]) URL.revokeObjectURL(p[index]!)
        const next: [string | null, string | null] = [...p]
        next[index] = null
        return next
      })
      setPhotoFiles((f) => {
        const next: [File | null, File | null] = [...f]
        next[index] = null
        return next
      })
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tarayıcınız konum desteklemiyor.')
      return
    }
    setFetchingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLat(pos.coords.latitude)
        setCurrentLng(pos.coords.longitude)
        setCurrentAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        setFetchingLocation(false)
      },
      () => {
        alert('Konum alınamadı.')
        setFetchingLocation(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const canNextStep1 = vehicleType !== null && transmission !== null
  const canNextStep2 =
    wheelsTurn !== null &&
    gearboxLocked !== null &&
    vehicleInDitch !== null &&
    photoFiles[0] !== null &&
    photoFiles[1] !== null
  const canSubmit =
    (currentAddress.trim() !== '' || (currentLat != null && currentLng != null)) &&
    destinationAddress.trim() !== ''

  const submit = async () => {
    if (!categoryId || !canSubmit) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login?redirect=/cekici/yeni')
      return
    }

    setSubmitting(true)
    try {
      const uploads: string[] = []
      for (const file of photoFiles) {
        if (!file) continue
        const form = new FormData()
        form.append('file', file)
        form.append('bucket', 'job-media')
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Fotoğraf yüklenemedi')
        uploads.push(data.publicUrl)
      }

      const descriptionParts = [
        `[Çekici] Araç: ${vehicleType}, Şanzıman: ${transmission}`,
        `Tekerlekler dönüyor: ${wheelsTurn ? 'Evet' : 'Hayır'}`,
        `Şanzıman kilitli: ${gearboxLocked ? 'Evet' : 'Hayır'}`,
        `Kanala/hendek: ${vehicleInDitch ? 'Evet' : 'Hayır'}`,
        note.trim() ? `Not: ${note}` : '',
        currentAddress.trim() ? `Mevcut konum: ${currentAddress}` : '',
      ].filter(Boolean)
      const description = descriptionParts.join('\n')

      const lat = currentLat ?? 41.0082
      const lng = currentLng ?? 28.9784
      const address = destinationAddress.trim() || currentAddress.trim() || 'Adres girilmedi'

      const payload = {
        customer_id: user.id,
        category_id: categoryId,
        title: 'Çekici talebi',
        description,
        address,
        lat,
        lng,
        status: 'open',
        job_type: 'urgent',
        ...(uploads.length ? { images: uploads } : {}),
      }
      const { data: job, error } = await supabase
        .from('jobs')
        .insert({ ...payload, service_type: 'cekici' } as Record<string, unknown>)
        .select('id')
        .single()

      if (error) {
        const { data: fallbackJob, error: fallbackError } = await supabase
          .from('jobs')
          .insert(payload)
          .select('id')
          .single()
        if (fallbackError) throw fallbackError
        router.push(`/cekici/${fallbackJob?.id}`)
        return
      }
      router.push(`/cekici/${job?.id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Talep oluşturulamadı'
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-orange-400">Çekici talebi</h1>
        </header>

        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? 'bg-orange-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* ADIM 1 */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <p className="text-sm text-slate-400">Araç tipi</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {VEHICLE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleType(v.id)}
                  className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-colors ${
                    vehicleType === v.id
                      ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-slate-400">{v.icon}</span>
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              ))}
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Şanzıman</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTransmission('manuel')}
                  className={`flex-1 py-3 rounded-xl font-medium ${
                    transmission === 'manuel'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  Manuel
                </button>
                <button
                  type="button"
                  onClick={() => setTransmission('otomatik')}
                  className={`flex-1 py-3 rounded-xl font-medium ${
                    transmission === 'otomatik'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  Otomatik
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADIM 2 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <YesNoRow
              label="Tekerlekler dönüyor mu?"
              value={wheelsTurn}
              onChange={setWheelsTurn}
            />
            <YesNoRow
              label="Şanzıman kilitli mi?"
              value={gearboxLocked}
              onChange={setGearboxLocked}
            />
            <YesNoRow
              label="Araç kanala/hendek mi düştü?"
              value={vehicleInDitch}
              onChange={setVehicleInDitch}
            />
            <div>
              <label className="block text-sm text-slate-400 mb-2">Serbest not (max 300 karakter)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 300))}
                maxLength={300}
                rows={3}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="Ek bilgi yazın..."
              />
              <p className="text-xs text-slate-500 mt-1">{note.length}/300</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">2 fotoğraf (zorunlu)</p>
              <div className="grid grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <label
                    key={i}
                    className="aspect-square rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-orange-500/50 overflow-hidden"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoChange(i as 0 | 1, e.target.files?.[0] ?? null)}
                    />
                    {photoPreviews[i] ? (
                      <img
                        src={photoPreviews[i]!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-slate-500" />
                        <span className="text-xs text-slate-500">Fotoğraf {i + 1}</span>
                      </>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ADIM 3 */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Mevcut konum</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={fetchingLocation}
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {fetchingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  Konum al
                </button>
                <input
                  type="text"
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="Veya adresi yazın"
                  className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
              {(currentLat != null && currentLng != null) && (
                <p className="text-xs text-slate-500 mt-1">
                  {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Gidilecek konum (servis/sanayi)</label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Adres veya servis adı"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>
        )}

        <div className="mt-10 flex gap-3">
          {step < 2 ? (
            <>
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 0 && !canNextStep1) || (step === 1 && !canNextStep2)
                }
                className="flex-1 py-3.5 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                İleri <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Talebi gönder'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div>
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 py-2.5 rounded-xl font-medium ${
            value === true ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          Evet
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 py-2.5 rounded-xl font-medium ${
            value === false ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          Hayır
        </button>
      </div>
    </div>
  )
}
