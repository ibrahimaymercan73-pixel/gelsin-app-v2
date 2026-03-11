'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

type Step = 1 | 2 | 3
type Transmission = 'manuel' | 'otomatik'

export default function MusteriSoforYeniPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)

  // Adım 1
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')

  // Adım 2
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [plate, setPlate] = useState('')
  const [transmission, setTransmission] = useState<Transmission>('manuel')

  // Adım 3
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')

  const supabase = createHizmetlerClient()

  const canNextFromStep1 = () =>
    pickupLocation.trim() !== '' && dropoffLocation.trim() !== ''

  const canNextFromStep2 = () =>
    brand.trim() !== '' && model.trim() !== '' && plate.trim() !== ''

  const canSubmit = () => date !== '' && time !== ''

  const handleNext = () => {
    if (step === 1 && !canNextFromStep1()) return
    if (step === 2 && !canNextFromStep2()) return
    setStep((s) => (s < 3 ? (s + 1) as Step : s))
  }

  const handlePrev = () => {
    setStep((s) => (s > 1 ? (s - 1) as Step : s))
  }

  const handleSubmit = async () => {
    if (!canSubmit()) return
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/hizmetler/giris')
        return
      }

      const vehicle = `${brand.trim()} ${model.trim()} - ${plate.trim()}`
      const descriptionParts = [
        `Araç: ${vehicle}`,
        `Vites: ${transmission === 'manuel' ? 'Düz' : 'Otomatik'}`,
        note.trim() ? `Not: ${note.trim()}` : '',
      ].filter(Boolean)

      const scheduledAt = new Date(`${date}T${time}:00`).toISOString()

      const { data, error } = await supabase
        .from('jobs')
        .insert({
          customer_id: user.id,
          title: `${vehicle} - Şoför Talebi`,
          description: descriptionParts.join('\n'),
          service_type: 'sofor',
          status: 'open',
          pickup_location: pickupLocation.trim(),
          dropoff_location: dropoffLocation.trim(),
          vehicle_type: vehicle,
          transmission_type: transmission,
          scheduled_at: scheduledAt,
        } as any)
        .select('id')
        .single()

      if (error || !data?.id) {
        throw error || new Error('Talep oluşturulamadı.')
      }

      router.replace(`/musteri/sofor/bekle/${data.id}`)
    } catch (e: any) {
      alert(e?.message || 'Talep oluşturulamadı.')
    } finally {
      setLoading(false)
    }
  }

  const stepTitle = (s: Step) => {
    if (s === 1) return 'Konum Bilgileri'
    if (s === 2) return 'Araç Bilgisi'
    return 'Tarih ve Saat'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 gap-6">
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-500">
            Özel Şoför
          </p>
          <h1 className="text-lg font-bold">{stepTitle(step)}</h1>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full ${
                  s <= step ? 'bg-indigo-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </header>

        <main className="flex-1 flex flex-col gap-4 text-xs">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-slate-200">
                  Alınacak Konum
                </label>
                <textarea
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Adresi detaylı yazın."
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-200">
                  Gidilecek Yer
                </label>
                <textarea
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Örn: Havalimanı, ofis, şehir dışı adres..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-slate-200">
                  Araç Markası
                </label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Örn: BMW"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-200">
                  Araç Modeli
                </label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Örn: 3.20i"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-200">
                  Plaka
                </label>
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="34 ABC 123"
                />
              </div>
              <div>
                <p className="mb-1 text-slate-200">Vites Tipi</p>
                <div className="flex gap-2">
                  {[
                    { key: 'manuel', label: 'Düz' },
                    { key: 'otomatik', label: 'Otomatik' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTransmission(t.key as Transmission)}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs border ${
                        transmission === t.key
                          ? 'bg-indigo-500 border-indigo-300 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-200">
                    Tarih
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-200">
                    Saat
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-slate-200">
                  Not (opsiyonel)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 300))}
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Örn: Çocuk koltuğu lazım, çok valiz olacak..."
                />
                <p className="text-[11px] text-slate-500 text-right">
                  {note.length}/300
                </p>
              </div>
            </div>
          )}
        </main>

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
              disabled={
                (step === 1 && !canNextFromStep1()) ||
                (step === 2 && !canNextFromStep2())
              }
              className="px-4 py-2 rounded-xl bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-900/50 disabled:opacity-50"
            >
              İleri
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canSubmit()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-xs font-semibold text-emerald-950 shadow-md shadow-emerald-900/40 disabled:opacity-60 flex items-center gap-2"
            >
              {loading && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Talebi Oluştur
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

