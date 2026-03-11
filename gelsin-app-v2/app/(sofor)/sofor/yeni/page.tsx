'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Step = 1 | 2 | 3
type ServiceKind = 'one-way' | 'hourly'
type Duration =
  | '1saat'
  | '2saat'
  | '4saat'
  | '8saat'
  | 'tam-gun'
  | null
type VehicleType = 'sedan' | 'suv' | 'minibus' | 'kamyonet' | null
type Transmission = 'manuel' | 'otomatik' | 'farketmez'

export default function Page() {
  const router = useRouter()

  const [checkingSession, setCheckingSession] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [step, setStep] = useState<Step>(1)

  // Adım 1
  const [serviceKind, setServiceKind] = useState<ServiceKind>('one-way')
  const [duration, setDuration] = useState<Duration>(null)

  // Adım 2
  const [vehicleType, setVehicleType] = useState<VehicleType>(null)
  const [transmission, setTransmission] = useState<Transmission>('farketmez')
  const [note, setNote] = useState('')

  // Adım 3
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login?redirect=/sofor/yeni')
        return
      }

      setUserId(session.user.id)
      setCheckingSession(false)
    }

    check()
  }, [router])

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Konum servisi bu cihazda desteklenmiyor.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const value = `Konum: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        setPickupLocation(value)
      },
      () => {
        alert('Konum alınamadı. Lütfen manuel girin.')
      }
    )
  }

  const canGoNextFromStep1 = () => {
    if (serviceKind === 'hourly') {
      return duration !== null
    }
    return true
  }

  const canGoNextFromStep2 = () => {
    return !!vehicleType
  }

  const handleNext = () => {
    if (step === 1 && !canGoNextFromStep1()) return
    if (step === 2 && !canGoNextFromStep2()) return
    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev))
  }

  const handlePrev = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))
  }

  const handleSubmit = async () => {
    if (!userId) return
    if (!pickupLocation.trim()) {
      alert('Alınacak konumu girin.')
      return
    }
    if (serviceKind === 'one-way' && !dropoffLocation.trim()) {
      alert('Bırakılacak konumu girin.')
      return
    }
    if (!date || !time) {
      alert('Tarih ve saat seçin.')
      return
    }
    if (!vehicleType) {
      alert('Araç tipini seçin.')
      return
    }

    const fullDurationLabel =
      serviceKind === 'one-way'
        ? 'Tek Yön'
        : duration === '1saat'
        ? '1 Saat'
        : duration === '2saat'
        ? '2 Saat'
        : duration === '4saat'
        ? '4 Saat'
        : duration === '8saat'
        ? '8 Saat'
        : 'Tam Gün'

    const meta = {
      serviceKind,
      duration: serviceKind === 'one-way' ? null : fullDurationLabel,
      vehicleType,
      transmission,
      pickupLocation,
      dropoffLocation: serviceKind === 'one-way' ? dropoffLocation : null,
      date,
      time,
    }

    const titleVehicle =
      vehicleType === 'sedan'
        ? 'Sedan'
        : vehicleType === 'suv'
        ? 'SUV'
        : vehicleType === 'minibus'
        ? 'Minibüs'
        : vehicleType === 'kamyonet'
        ? 'Kamyonet'
        : 'Araç'

    const baseNote = note.trim()
    const description =
      (baseNote ? `${baseNote}\n\n` : '') +
      `DETAYLAR:\n` +
      JSON.stringify(meta, null, 2)

    const datetimeIso = new Date(`${date}T${time}:00`).toISOString()

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          title: `${titleVehicle} - Şoför Talebi`,
          description,
          service_type: 'sofor',
          status: 'open',
          customer_id: userId,
          pickup_location: pickupLocation,
          dropoff_location:
            serviceKind === 'one-way' ? dropoffLocation : null,
          vehicle_type: vehicleType,
          transmission_type: transmission,
          driver_duration:
            serviceKind === 'one-way' ? null : fullDurationLabel,
          scheduled_at: datetimeIso,
        })
        .select('id')
        .single()

      if (error || !data?.id) {
        throw error || new Error('Kayıt oluşturulamadı.')
      }

      router.replace(`/sofor/${data.id}`)
    } catch (e: any) {
      alert(e?.message || 'Talep oluşturulurken bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-sm text-slate-400">
          Yükleniyor...
        </div>
      </div>
    )
  }

  const stepLabel = (s: Step) => {
    if (s === 1) return 'Hizmet Tipi'
    if (s === 2) return 'Araç Bilgisi'
    return 'Konum ve Zaman'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 gap-6">
        {/* Adım göstergesi */}
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-500">
            Özel Şoför
          </p>
          <h1 className="text-xl font-bold">Yeni Şoför Talebi</h1>
          <div className="flex items-center gap-2 text-xs">
            {[1, 2, 3].map((s) => {
              const active = s === step
              const done = s < step
              return (
                <div
                  key={s}
                  className="flex-1 flex items-center gap-2"
                >
                  <div
                    className={[
                      'w-7 h-7 rounded-full flex items-center justify-center border text-[11px]',
                      active
                        ? 'bg-indigo-500 text-white border-indigo-400'
                        : done
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400',
                    ].join(' ')}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-slate-800" />
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400">{stepLabel(step)}</p>
        </header>

        {/* İçerik */}
        <main className="flex-1 flex flex-col gap-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setServiceKind('one-way')}
                  className={[
                    'w-full rounded-2xl p-4 text-left flex items-start gap-3 active:scale-[0.99] transition-transform border',
                    serviceKind === 'one-way'
                      ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/60'
                      : 'bg-slate-900 border-slate-800',
                  ].join(' ')}
                >
                  <span className="text-2xl">🚗</span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Tek Yön</p>
                    <p className="text-xs text-slate-300">
                      Beni bir yerden al, bir yere bırak
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceKind('hourly')}
                  className={[
                    'w-full rounded-2xl p-4 text-left flex items-start gap-3 active:scale-[0.99] transition-transform border',
                    serviceKind === 'hourly'
                      ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/60'
                      : 'bg-slate-900 border-slate-800',
                  ].join(' ')}
                >
                  <span className="text-2xl">⏱️</span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      Saatlik / Günlük
                    </p>
                    <p className="text-xs text-slate-300">
                      Benim şoförüm ol
                    </p>
                  </div>
                </button>
              </div>

              {serviceKind === 'hourly' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-300">
                    Süre Seçimi
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: '1saat', label: '1 saat' },
                      { key: '2saat', label: '2 saat' },
                      { key: '4saat', label: '4 saat' },
                      { key: '8saat', label: '8 saat' },
                      { key: 'tam-gun', label: 'Tam Gün' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setDuration(opt.key as Duration)}
                        className={[
                          'rounded-xl px-3 py-2 text-xs font-medium border',
                          duration === opt.key
                            ? 'bg-indigo-500 border-indigo-300 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-200',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300">
                  Araç Tipi
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'sedan', label: 'Sedan', icon: '🚗' },
                    { key: 'suv', label: 'SUV', icon: '🚙' },
                    { key: 'minibus', label: 'Minibüs', icon: '🚐' },
                    { key: 'kamyonet', label: 'Kamyonet', icon: '🛻' },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() =>
                        setVehicleType(v.key as VehicleType)
                      }
                      className={[
                        'rounded-2xl px-3 py-3 text-left flex items-center gap-2 border text-xs active:scale-[0.99] transition-transform',
                        vehicleType === v.key
                          ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/60'
                          : 'bg-slate-900 border-slate-800',
                      ].join(' ')}
                    >
                      <span className="text-lg">{v.icon}</span>
                      <span className="font-medium">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300">
                  Vites Tipi
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'manuel', label: 'Manuel' },
                    { key: 'otomatik', label: 'Otomatik' },
                    { key: 'farketmez', label: 'Farketmez' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() =>
                        setTransmission(t.key as Transmission)
                      }
                      className={[
                        'rounded-full px-3 py-1 text-xs border',
                        transmission === t.key
                          ? 'bg-indigo-500 border-indigo-300 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-200',
                      ].join(' ')}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Ek Not (opsiyonel)
                </label>
                <textarea
                  value={note}
                  onChange={(e) =>
                    setNote(e.target.value.slice(0, 300))
                  }
                  rows={4}
                  className="w-full rounded-2xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Örn: Çocuk koltuğu olsun, bagaj geniş olsun..."
                />
                <p className="text-[11px] text-slate-500 text-right">
                  {note.length}/300
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Alınacak Konum
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUseGps}
                    className="px-3 py-2 rounded-xl bg-indigo-600 text-xs font-medium flex-shrink-0 hover:bg-indigo-500"
                  >
                    GPS
                  </button>
                  <input
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Adres veya konum bilgisi"
                  />
                </div>
              </div>

              {serviceKind === 'one-way' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    Bırakılacak Konum
                  </label>
                  <input
                    value={dropoffLocation}
                    onChange={(e) =>
                      setDropoffLocation(e.target.value)
                    }
                    className="w-full rounded-2xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Adres veya konum bilgisi"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    Tarih
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-2xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    Saat
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-2xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Alt butonlar */}
        <footer className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={step === 1 ? () => router.back() : handlePrev}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
          >
            {step === 1 ? 'Vazgeç' : 'Geri'}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-900/50 disabled:opacity-50"
              disabled={
                (step === 1 && !canGoNextFromStep1()) ||
                (step === 2 && !canGoNextFromStep2())
              }
            >
              İleri
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-xs font-semibold text-emerald-950 shadow-md shadow-emerald-900/40 disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && (
                <span className="w-3 h-3 rounded-full border-2 border-emerald-900 border-t-transparent animate-spin" />
              )}
              Talebi Oluştur
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}


