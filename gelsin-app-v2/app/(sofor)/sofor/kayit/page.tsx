'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Step = 1 | 2 | 3 | 4 | 5

export default function SoforKayitPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [step, setStep] = useState<Step>(1)

  // Adım 1
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // Adım 2
  const [licenceClass, setLicenceClass] = useState<'B' | 'E' | 'D' | null>(
    null
  )
  const [licenceYear, setLicenceYear] = useState('')
  const [licenceFile, setLicenceFile] = useState<File | null>(null)

  // Adım 3
  const [criminalRecordFile, setCriminalRecordFile] =
    useState<File | null>(null)
  const [hasCleanRecord, setHasCleanRecord] = useState(false)

  // Adım 4
  const [vehiclePrefs, setVehiclePrefs] = useState<string[]>([])
  const [gearType, setGearType] = useState<'manuel' | 'otomatik' | 'herikisi'>(
    'herikisi'
  )

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

  const toggleVehiclePref = (v: string) => {
    setVehiclePrefs((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
  }

  const canNextFromStep = (s: Step) => {
    if (s === 1) {
      return fullName.trim().length > 2 && phone.trim().length >= 10
    }
    if (s === 2) {
      return !!licenceClass && !!licenceYear && !!licenceFile
    }
    if (s === 3) {
      return !!criminalRecordFile && hasCleanRecord
    }
    if (s === 4) {
      return vehiclePrefs.length > 0 && !!gearType
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
    if (!licenceFile || !criminalRecordFile) {
      alert('Gerekli belgeleri yükleyin.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      const ts = Date.now()
      const basePath = `sofor/${userId}/${ts}`

      const licencePath = `${basePath}-ehliyet.${licenceFile.name.split('.').pop() || 'jpg'}`
      const criminalPath = `${basePath}-sabika.${criminalRecordFile.name.split('.').pop() || 'jpg'}`

      const { error: up1, data: up1Data } = await supabase.storage
        .from('documents')
        .upload(licencePath, licenceFile, { upsert: true })
      if (up1) throw up1

      const { error: up2, data: up2Data } = await supabase.storage
        .from('documents')
        .upload(criminalPath, criminalRecordFile, { upsert: true })
      if (up2) throw up2

      const licenceUrl = supabase.storage.from('documents').getPublicUrl(up1Data.path).data
        .publicUrl
      const criminalUrl = supabase.storage.from('documents').getPublicUrl(up2Data.path).data
        .publicUrl

      const { error } = await supabase.from('provider_profiles').insert({
        user_id: userId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        service_type: 'sofor',
        status: 'pending',
        licence_class: licenceClass,
        licence_year: licenceYear,
        vehicle_preferences: vehiclePrefs,
        gear_type: gearType,
        has_clean_record: hasCleanRecord,
        iban: cleanIban,
        documents: {
          ehliyet: licenceUrl,
          sabika: criminalUrl,
        },
      })
      if (error) throw error

      router.replace('/sofor/ustalar')
    } catch (e: any) {
      alert(e?.message || 'Kayıt tamamlanamadı.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-indigo-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  const stepTitle = (s: Step) => {
    if (s === 1) return 'Kişisel Bilgiler'
    if (s === 2) return 'Ehliyet Bilgisi'
    if (s === 3) return 'Sabıka Kaydı'
    if (s === 4) return 'Araç Tercihleri'
    return 'IBAN Bilgisi'
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 gap-6">
        {/* Progress */}
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-indigo-200">
            Şoför Kaydı
          </p>
          <h1 className="text-lg font-bold">{stepTitle(step)}</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => {
              const active = s === step
              const done = s < step
              return (
                <div key={s} className="flex-1 h-1.5 rounded-full bg-indigo-900 overflow-hidden">
                  <div
                    className={`h-full ${
                      done
                        ? 'bg-emerald-400'
                        : active
                        ? 'bg-indigo-400'
                        : 'bg-indigo-900'
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
                  className="w-full rounded-xl bg-indigo-900 border border-indigo-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Adınız Soyadınız"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-200">Telefon</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  className="w-full rounded-xl bg-indigo-900 border border-indigo-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="05xx xxx xx xx"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-200">
                  Ehliyet Sınıfı
                </p>
                <div className="flex gap-2">
                  {['B', 'E', 'D'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setLicenceClass(c as typeof licenceClass)
                      }
                      className={`flex-1 rounded-xl px-3 py-2 text-xs border ${
                        licenceClass === c
                          ? 'bg-indigo-500/30 border-indigo-300 text-white'
                          : 'bg-indigo-900 border-indigo-700 text-slate-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-slate-200">
                    Ehliyet Yılı
                  </label>
                  <input
                    value={licenceYear}
                    onChange={(e) => setLicenceYear(e.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-xl bg-indigo-900 border border-indigo-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Örn: 2015"
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
                      setLicenceFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-xs text-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-slate-200 text-xs">
                  Sabıka Kaydı Belgesi{' '}
                  <span className="text-amber-400">*</span>
                </p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setCriminalRecordFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-xs text-slate-300"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={hasCleanRecord}
                  onChange={(e) => setHasCleanRecord(e.target.checked)}
                  className="w-4 h-4 rounded border-indigo-400"
                />
                Temiz sabıka kaydım var
              </label>
              <p className="text-[11px] text-slate-400">
                Güvenli yolculuk için sürücü geçmişini kontrol ediyoruz.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-slate-200 text-xs">
                  Kullanabileceğiniz Araçlar (çoklu seçim)
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
                  className="w-full rounded-xl bg-indigo-900 border border-indigo-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
            className="px-4 py-2 rounded-xl bg-indigo-900 border border-indigo-700 text-xs text-slate-200"
          >
            {step === 1 ? 'Vazgeç' : 'Geri'}
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNextFromStep(step)}
              className="px-4 py-2 rounded-xl bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-900/50 disabled:opacity-50"
            >
              İleri
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-xs font-semibold text-emerald-950 shadow-md shadow-emerald-900/50 disabled:opacity-60 flex items-center gap-2"
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


