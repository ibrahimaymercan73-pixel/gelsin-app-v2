'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Car,
  Truck,
  Bus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Navigation,
  Clock,
} from 'lucide-react'

type ServiceType = 'tek_yon' | 'saatlik_gunluk'
type Duration = '1' | '2' | '4' | '8' | 'tam_gun'
type VehicleType = 'sedan' | 'suv' | 'minibus' | 'kamyonet'
type Transmission = 'manuel' | 'otomatik'

const DURATION_OPTIONS: { id: Duration; label: string }[] = [
  { id: '1', label: '1 saat' },
  { id: '2', label: '2 saat' },
  { id: '4', label: '4 saat' },
  { id: '8', label: '8 saat' },
  { id: 'tam_gun', label: 'Tam Gün' },
]

const VEHICLE_OPTIONS: { id: VehicleType; label: string; icon: React.ReactNode }[] = [
  { id: 'sedan', label: 'Sedan', icon: <Car className="w-8 h-8" /> },
  { id: 'suv', label: 'SUV', icon: <Car className="w-8 h-8" /> },
  { id: 'minibus', label: 'Minibüs', icon: <Bus className="w-8 h-8" /> },
  { id: 'kamyonet', label: 'Kamyonet', icon: <Truck className="w-8 h-8" /> },
]

const STEPS = ['Hizmet Tipi', 'Araç Bilgisi', 'Konum ve Zaman']

export default function SoforYeniPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)

  // Adım 1
  const [serviceType, setServiceType] = useState<ServiceType | null>(null)
  const [duration, setDuration] = useState<Duration | null>(null)

  // Adım 2
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null)
  const [transmission, setTransmission] = useState<Transmission | null>(null)
  const [note, setNote] = useState('')

  // Adım 3
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [dropoffLat, setDropoffLat] = useState<number | null>(null)
  const [dropoffLng, setDropoffLng] = useState<number | null>(null)
  const [fetchingPickup, setFetchingPickup] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [categoryId, setCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?redirect=/sofor/yeni')
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

  const getPickupLocation = () => {
    if (!navigator.geolocation) {
      alert('Tarayıcınız konum desteklemiyor.')
      return
    }
    setFetchingPickup(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupLat(pos.coords.latitude)
        setPickupLng(pos.coords.longitude)
        setPickupAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        setFetchingPickup(false)
      },
      () => {
        alert('Konum alınamadı.')
        setFetchingPickup(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const canNextStep1 = serviceType !== null && (serviceType === 'tek_yon' || duration !== null)
  const canNextStep2 = vehicleType !== null && transmission !== null
  const canSubmit =
    (pickupAddress.trim() !== '' || (pickupLat != null && pickupLng != null)) &&
    (serviceType !== 'tek_yon' || dropoffAddress.trim() !== '') &&
    dateValue !== '' &&
    timeValue !== ''

  const submit = async () => {
    if (!categoryId || !canSubmit) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login?redirect=/sofor/yeni')
      return
    }

    setSubmitting(true)
    try {
      const lat = pickupLat ?? 41.0082
      const lng = pickupLng ?? 28.9784
      const address =
        serviceType === 'tek_yon'
          ? `${pickupAddress.trim() || 'Alınacak'} → ${dropoffAddress.trim() || 'Bırakılacak'}`
          : pickupAddress.trim() || 'Adres girilmedi'

      const descriptionParts = [
        `[Özel Şoför] Hizmet: ${serviceType === 'tek_yon' ? 'Tek Yön' : 'Saatlik/Günlük'}`,
        serviceType === 'saatlik_gunluk' && duration
          ? `Süre: ${DURATION_OPTIONS.find((d) => d.id === duration)?.label ?? duration}`
          : '',
        `Araç: ${vehicleType}, Vites: ${transmission}`,
        note.trim() ? `Not: ${note}` : '',
        dateValue ? `Tarih: ${dateValue}` : '',
        timeValue ? `Saat: ${timeValue}` : '',
        pickupAddress.trim() ? `Alınacak: ${pickupAddress}` : '',
        serviceType === 'tek_yon' && dropoffAddress.trim() ? `Bırakılacak: ${dropoffAddress}` : '',
      ].filter(Boolean)
      const description = descriptionParts.join('\n')

      const payload = {
        customer_id: user.id,
        category_id: categoryId,
        title: 'Özel şoför talebi',
        description,
        address,
        lat,
        lng,
        status: 'open',
        job_type: 'urgent',
        scheduled_at: dateValue && timeValue ? `${dateValue}T${timeValue}:00` : null,
      }

      const { data: job, error } = await supabase
        .from('jobs')
        .insert({ ...payload, service_type: 'sofor' } as Record<string, unknown>)
        .select('id')
        .single()

      if (error) {
        const { data: fallbackJob, error: fallbackError } = await supabase
          .from('jobs')
          .insert(payload)
          .select('id')
          .single()
        if (fallbackError) throw fallbackError
        router.push(`/sofor/${fallbackJob?.id}`)
        return
      }
      router.push(`/sofor/${job?.id}`)
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
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
            className="p-2 rounded-xl bg-indigo-900/80 text-amber-400/90 hover:bg-indigo-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-amber-400">Özel şoför talebi</h1>
        </header>

        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? 'bg-amber-500' : 'bg-indigo-800'
              }`}
            />
          ))}
        </div>

        {/* ADIM 1 - Hizmet Tipi */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <p className="text-sm text-slate-400">Hizmet tipini seçin</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setServiceType('tek_yon')
                  setDuration(null)
                }}
                className={`rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-colors ${
                  serviceType === 'tek_yon'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-indigo-800 bg-indigo-900/50 text-slate-300 hover:border-indigo-600'
                }`}
              >
                <Navigation className="w-12 h-12 text-current" />
                <span className="font-semibold">Tek Yön</span>
                <span className="text-xs text-slate-400 text-center">
                  Beni bir yerden al, bir yere bırak
                </span>
              </button>
              <button
                type="button"
                onClick={() => setServiceType('saatlik_gunluk')}
                className={`rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-colors ${
                  serviceType === 'saatlik_gunluk'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-indigo-800 bg-indigo-900/50 text-slate-300 hover:border-indigo-600'
                }`}
              >
                <Clock className="w-12 h-12 text-current" />
                <span className="font-semibold">Saatlik / Günlük</span>
                <span className="text-xs text-slate-400 text-center">
                  Benim şoförüm ol
                </span>
              </button>
            </div>

            {serviceType === 'saatlik_gunluk' && (
              <div className="pt-2">
                <p className="text-sm text-slate-400 mb-3">Süre</p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDuration(d.id)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        duration === d.id
                          ? 'bg-amber-500 text-slate-900'
                          : 'bg-indigo-800 text-slate-300 border border-indigo-700 hover:border-amber-500/50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADIM 2 - Araç Bilgisi */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <p className="text-sm text-slate-400">Araç tipi</p>
            <div className="grid grid-cols-2 gap-3">
              {VEHICLE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleType(v.id)}
                  className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-colors ${
                    vehicleType === v.id
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                      : 'border-indigo-800 bg-indigo-900/50 text-slate-300 hover:border-indigo-600'
                  }`}
                >
                  <span className="text-slate-400">{v.icon}</span>
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              ))}
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Vites tipi</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTransmission('manuel')}
                  className={`flex-1 py-3 rounded-xl font-medium ${
                    transmission === 'manuel'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-indigo-800 text-slate-300 border border-indigo-700'
                  }`}
                >
                  Manuel
                </button>
                <button
                  type="button"
                  onClick={() => setTransmission('otomatik')}
                  className={`flex-1 py-3 rounded-xl font-medium ${
                    transmission === 'otomatik'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-indigo-800 text-slate-300 border border-indigo-700'
                  }`}
                >
                  Otomatik
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Serbest not (max 300 karakter)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 300))}
                maxLength={300}
                rows={3}
                className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="Ek bilgi yazın..."
              />
              <p className="text-xs text-slate-500 mt-1">{note.length}/300</p>
            </div>
          </div>
        )}

        {/* ADIM 3 - Konum ve Zaman */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Alınacak konum</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={getPickupLocation}
                  disabled={fetchingPickup}
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-amber-500 text-slate-900 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {fetchingPickup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  Konum al
                </button>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Veya adresi yazın"
                  className="flex-1 rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {serviceType === 'tek_yon' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Bırakılacak konum</label>
                <input
                  type="text"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder="Adres veya nokta"
                  className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Tarih</label>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Saat</label>
                <input
                  type="time"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="w-full rounded-xl bg-indigo-900/50 border border-indigo-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex gap-3">
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && !canNextStep1) || (step === 1 && !canNextStep2)
              }
              className="flex-1 py-3.5 rounded-xl bg-amber-500 text-slate-900 font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              İleri <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-900 font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
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
