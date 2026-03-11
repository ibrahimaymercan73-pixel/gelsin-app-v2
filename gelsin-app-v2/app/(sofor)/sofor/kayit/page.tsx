'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, ChevronLeft, ChevronRight, UploadCloud, CheckCircle2 } from 'lucide-react'

const STEPS = ['Kişisel', 'Ehliyet', 'Sabıka', 'Tercihler', 'IBAN'] as const

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Minibüs', 'Kamyonet'] as const
type TransmissionPref = 'manuel' | 'otomatik' | 'her_ikisi'

function clampText(s: string, n: number) {
  return s.length > n ? s.slice(0, n) : s
}

async function uploadToDocuments(file: File, subpath: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('bucket', 'documents')
  form.append('subpath', subpath)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Yükleme başarısız')
  return String(data.publicUrl)
}

export default function SoforKayitPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // ADIM 1
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // ADIM 2
  const [licenseClass, setLicenseClass] = useState('B')
  const [licenseYear, setLicenseYear] = useState('')
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [licenseName, setLicenseName] = useState('')

  // ADIM 3
  const [criminalFile, setCriminalFile] = useState<File | null>(null)
  const [criminalName, setCriminalName] = useState('')
  const [criminalCleanOk, setCriminalCleanOk] = useState(false)

  // ADIM 4
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([])
  const [transmissionPref, setTransmissionPref] = useState<TransmissionPref | null>(null)
  const [note, setNote] = useState('')

  // ADIM 5
  const [iban, setIban] = useState('')

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login?redirect=/sofor/kayit')
        return
      }
      setAuthChecked(true)
    }
    run()
  }, [router])

  const canNext = useMemo(() => {
    if (step === 0) return fullName.trim().length >= 2 && phone.trim().length >= 8
    if (step === 1) return !!licenseClass && !!licenseYear && !!licenseFile
    if (step === 2) return !!criminalFile && criminalCleanOk
    if (step === 3) return vehicleTypes.length >= 1 && transmissionPref !== null
    if (step === 4) return iban.trim().length >= 10
    return false
  }, [step, fullName, phone, licenseClass, licenseYear, licenseFile, criminalFile, criminalCleanOk, vehicleTypes.length, transmissionPref, iban])

  const toggleVehicleType = (v: string) => {
    setVehicleTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  const save = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?redirect=/sofor/kayit')
        return
      }

      const [licenseUrl, criminalUrl] = await Promise.all([
        uploadToDocuments(licenseFile!, 'sofor-ehliyet'),
        uploadToDocuments(criminalFile!, 'sofor-sabika'),
      ])

      const meta = {
        type: 'sofor_onboarding',
        fullName: fullName.trim(),
        phone: phone.trim(),
        license: {
          class: licenseClass.trim().toUpperCase(),
          year: Number(String(licenseYear).replace(',', '.')) || null,
          photo: licenseUrl,
        },
        criminalRecord: {
          doc: criminalUrl,
          cleanConfirmed: criminalCleanOk,
        },
        preferences: {
          vehicleTypes,
          transmission: transmissionPref,
          note: clampText(note.trim(), 300),
        },
        iban: iban.trim(),
        createdAt: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('provider_profiles')
        .upsert({
          id: user.id,
          bio: JSON.stringify(meta),
          status: 'pending',
          is_onboarded: false,
          id_document_url: licenseUrl,
          criminal_record_url: criminalUrl,
        } as any)

      if (error) throw error
      setDone(true)
    } catch (e: any) {
      alert(e?.message || 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-slate-100 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">Şoför Kayıt</p>
            <h1 className="text-lg font-bold">Onboarding</h1>
          </div>
          <button
            type="button"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
            className="p-2 rounded-xl bg-indigo-900/80 text-slate-200 hover:bg-indigo-800"
            aria-label="Geri"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </header>

        <div className="space-y-2">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-amber-500' : 'bg-indigo-900/80'}`} />
            ))}
          </div>
          <p className="text-xs text-slate-500">{STEPS[step] ?? ''}</p>
        </div>

        {done ? (
          <div className="rounded-3xl border border-indigo-800 bg-indigo-900/30 p-6 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="font-semibold">Başvurun alındı</p>
            <p className="text-sm text-slate-500">Admin onayı sonrası hesabın aktif olacak.</p>
            <button
              type="button"
              onClick={() => router.push('/sofor')}
              className="w-full py-3 rounded-2xl bg-amber-500 text-slate-900 font-semibold"
            >
              Ana sayfaya dön
            </button>
          </div>
        ) : (
          <>
            {step === 0 && (
              <section className="rounded-3xl border border-indigo-800 bg-indigo-900/30 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ad Soyad</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl bg-indigo-950/40 border border-indigo-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Ad Soyad"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Telefon</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl bg-indigo-950/40 border border-indigo-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="05xx..."
                    inputMode="tel"
                  />
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="rounded-3xl border border-indigo-800 bg-indigo-900/30 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ehliyet sınıfı</label>
                  <input
                    value={licenseClass}
                    onChange={(e) => setLicenseClass(clampText(e.target.value.toUpperCase(), 3))}
                    className="w-full rounded-2xl bg-indigo-950/40 border border-indigo-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="B"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ehliyet yılı</label>
                  <input
                    value={licenseYear}
                    onChange={(e) => setLicenseYear(clampText(e.target.value.replace(/[^0-9]/g, ''), 4))}
                    className="w-full rounded-2xl bg-indigo-950/40 border border-indigo-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="2018"
                    inputMode="numeric"
                  />
                </div>
                <UploadField
                  label="Ehliyet fotoğrafı"
                  valueName={licenseName}
                  theme="sofor"
                  onPick={(f) => {
                    setLicenseFile(f)
                    setLicenseName(f?.name || '')
                  }}
                />
              </section>
            )}

            {step === 2 && (
              <section className="rounded-3xl border border-indigo-800 bg-indigo-900/30 p-5 space-y-4">
                <UploadField
                  label="Sabıka kaydı belgesi"
                  valueName={criminalName}
                  theme="sofor"
                  onPick={(f) => {
                    setCriminalFile(f)
                    setCriminalName(f?.name || '')
                  }}
                />
                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={criminalCleanOk}
                    onChange={(e) => setCriminalCleanOk(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-amber-500"
                  />
                  <span>Temiz sabıka kaydım var</span>
                </label>
                <p className="text-xs text-slate-500">Dosyalar `documents` bucket&apos;ına yüklenecek.</p>
              </section>
            )}

            {step === 3 && (
              <section className="rounded-3xl border border-indigo-800 bg-indigo-900/30 p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Kullanabileceğin araç tipleri</p>
                  <div className="flex flex-wrap gap-2">
                    {VEHICLE_TYPES.map((v) => {
                      const active = vehicleTypes.includes(v)
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleVehicleType(v)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            active
                              ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                              : 'border-indigo-800 bg-indigo-950/30 text-slate-300'
                          }`}
                        >
                          {v}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Vites tercihi</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'manuel', label: 'Manuel' },
                      { id: 'otomatik', label: 'Otomatik' },
                      { id: 'her_ikisi', label: 'Her ikisi' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTransmissionPref(t.id as TransmissionPref)}
                        className={`px-3 py-3 rounded-2xl border text-sm font-semibold ${
                          transmissionPref === t.id
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                            : 'border-indigo-800 bg-indigo-950/30 text-slate-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Not (opsiyonel)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 300))}
                    rows={3}
                    maxLength={300}
                    className="w-full rounded-2xl bg-indigo-950/40 border border-indigo-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Ek bilgi..."
                  />
                  <p className="text-xs text-slate-500 mt-1">{note.length}/300</p>
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="rounded-3xl border border-indigo-800 bg-indigo-900/30 p-5 space-y-3">
                <label className="block text-xs font-semibold text-slate-400">IBAN</label>
                <input
                  value={iban}
                  onChange={(e) => setIban(clampText(e.target.value.replace(/\s+/g, ''), 34))}
                  className="w-full rounded-2xl bg-indigo-950/40 border border-indigo-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  placeholder="TR..."
                />
                <p className="text-xs text-slate-500">Ödemeler için kullanılacak.</p>
              </section>
            )}

            <div className="flex gap-3">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 text-slate-900 font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  Devam <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={save}
                  disabled={!canNext || saving}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 text-slate-900 font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Başvuruyu Gönder
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function UploadField({
  label,
  valueName,
  onPick,
  theme,
}: {
  label: string
  valueName: string
  onPick: (f: File | null) => void
  theme: 'sofor'
}) {
  const iconColor = theme === 'sofor' ? 'text-amber-400' : 'text-slate-300'
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-400 mb-2">{label}</span>
      <div className="rounded-2xl border border-dashed border-indigo-700 bg-indigo-950/30 px-4 py-4 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-500/50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">
            {valueName ? valueName : 'Dosya seç'}
          </p>
          <p className="text-xs text-slate-500">JPG/PNG/WebP</p>
        </div>
        <UploadCloud className={`w-6 h-6 ${iconColor}`} />
      </div>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  )
}

