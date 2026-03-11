'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createHizmetlerClient } from '@/lib/supabase-hizmetler'

type Step = 1 | 2 | 3
type BreakdownType = 'lastik' | 'kaza' | 'yakit' | 'motor' | 'diger'

export default function MusteriCekiciYeniPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)

  // Adım 1
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')

  // Adım 2
  const [breakdownType, setBreakdownType] = useState<BreakdownType | null>(null)

  // Adım 3
  const [pickupLocation, setPickupLocation] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)

  const supabase = createHizmetlerClient()

  const canNextFromStep1 = () => brand.trim() !== '' && model.trim() !== ''
  const canNextFromStep2 = () => breakdownType !== null
  const canSubmit = () =>
    pickupLocation.trim() !== '' && files && files.length > 0

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

      const uploadedUrls: string[] = []
      if (files) {
        for (const file of Array.from(files)) {
          const form = new FormData()
          form.append('file', file)
          form.append('bucket', 'job-media')
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: form,
          })
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data?.error || 'Fotoğraf yüklenemedi')
          }
          uploadedUrls.push(data.publicUrl)
        }
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert({
          customer_id: user.id,
          title: `${brand.trim()} ${model.trim()} - Çekici Talebi`,
          service_type: 'cekici',
          status: 'open',
          vehicle_type: `${brand.trim()} ${model.trim()}`,
          breakdown_type: breakdownType,
          pickup_location: pickupLocation.trim(),
          images: uploadedUrls,
        } as any)
        .select('id')
        .single()

      if (error || !data?.id) {
        throw error || new Error('Talep oluşturulamadı')
      }

      router.replace(`/musteri/cekici/bekle/${data.id}`)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const stepTitle = (s: Step) => {
    if (s === 1) return 'Araç Bilgisi'
    if (s === 2) return 'Arıza Tipi'
    return 'Konum ve Fotoğraflar'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 gap-6">
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-300">
            Çekici Talebi
          </p>
          <h1 className="text-lg font-bold text-slate-50">{stepTitle(step)}</h1>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full ${
                  s <= step ? 'bg-orange-500' : 'bg-slate-800'
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
                  Araç Markası
                </label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  placeholder="Örn: Renault"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-200">
                  Araç Modeli
                </label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  placeholder="Örn: Clio"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 mb-1">
                Arıza Tipi
              </p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: 'lastik', label: 'Lastik Patladı', icon: '🛞' },
                  { key: 'kaza', label: 'Kaza Yaptı', icon: '💥' },
                  { key: 'yakit', label: 'Yakıt Bitti', icon: '⛽' },
                  { key: 'motor', label: 'Motor Arızası', icon: '⚙️' },
                  { key: 'diger', label: 'Diğer', icon: '❓' },
                ].map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBreakdownType(b.key as BreakdownType)}
                    className={`w-full rounded-2xl border px-3 py-3 flex items-center gap-3 text-left text-xs active:scale-[0.99] transition-transform ${
                      breakdownType === b.key
                        ? 'bg-orange-500/20 border-orange-400 text-orange-100'
                        : 'bg-slate-900 border-slate-700 text-slate-200'
                    }`}
                  >
                    <span className="text-xl">{b.icon}</span>
                    <span className="font-medium">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-slate-200">
                  Konum / Adres
                </label>
                <textarea
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  placeholder="Aracın bulunduğu adresi mümkün olduğunca detaylı yazın."
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-200">
                  Fotoğraflar (en az 1)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="w-full text-xs text-slate-300"
                />
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
              className="px-4 py-2 rounded-xl bg-orange-500 text-xs font-semibold text-slate-950 shadow-md shadow-orange-900/40 disabled:opacity-50"
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

