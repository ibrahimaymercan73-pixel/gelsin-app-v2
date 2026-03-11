'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, ChevronLeft, ChevronRight, UploadCloud, CheckCircle2 } from 'lucide-react'

type VehicleType = 'cekici' | 'kurtarici' | 'flatbed'

const STEPS = ['Kişisel', 'Araç', 'Belgeler', 'Bölge', 'IBAN'] as const

const CITIES_81 = [
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir',
  'Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli',
  'Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkâri',
  'Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir',
  'Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir',
  'Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat',
  'Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman',
  'Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce',
] as const

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

export default function CekiciKayitPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // ADIM 1
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // ADIM 2
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null)
  const [plate, setPlate] = useState('')
  const [craneTons, setCraneTons] = useState('')
  const [hasSlidingBed, setHasSlidingBed] = useState<boolean | null>(null)

  // ADIM 3
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [regFile, setRegFile] = useState<File | null>(null)
  const [licenseName, setLicenseName] = useState<string>('')
  const [regName, setRegName] = useState<string>('')

  // ADIM 4
  const [cities, setCities] = useState<string[]>([])
  const [cityQuery, setCityQuery] = useState('')

  // ADIM 5
  const [iban, setIban] = useState('')

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login?redirect=/cekici/kayit')
        return
      }
      setAuthChecked(true)
    }
    run()
  }, [router])

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase()
    if (!q) return CITIES_81 as unknown as string[]
    return (CITIES_81 as unknown as string[]).filter((c) => c.toLowerCase().includes(q))
  }, [cityQuery])

  const toggleCity = (c: string) => {
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const canNext = useMemo(() => {
    if (step === 0) return fullName.trim().length >= 2 && phone.trim().length >= 8
    if (step === 1) return !!vehicleType && plate.trim().length >= 5 && !!craneTons && hasSlidingBed !== null
    if (step === 2) return !!licenseFile && !!regFile
    if (step === 3) return cities.length >= 1
    if (step === 4) return iban.trim().length >= 10
    return false
  }, [step, fullName, phone, vehicleType, plate, craneTons, hasSlidingBed, licenseFile, regFile, cities.length, iban])

  const save = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?redirect=/cekici/kayit')
        return
      }

      const [licenseUrl, regUrl] = await Promise.all([
        uploadToDocuments(licenseFile!, 'cekici-ehliyet'),
        uploadToDocuments(regFile!, 'cekici-ruhsat'),
      ])

      // provider_profiles şemasında bu alanlar yok; bio içinde JSON olarak saklıyoruz.
      const meta = {
        type: 'cekici_onboarding',
        fullName: fullName.trim(),
        phone: phone.trim(),
        vehicle: {
          vehicleType,
          plate: plate.trim().toUpperCase(),
          craneTons: Number(String(craneTons).replace(',', '.')) || null,
          hasSlidingBed,
        },
        serviceCities: cities,
        iban: iban.trim(),
        documents: {
          license: licenseUrl,
          registration: regUrl,
        },
        createdAt: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('provider_profiles')
        .upsert({
          id: user.id,
          bio: JSON.stringify(meta),
          status: 'pending',
          is_onboarded: false,
          // Mevcut kolonlara mümkün olduğunca map:
          id_document_url: regUrl, // ruhsat
          criminal_record_url: licenseUrl, // isim uyuşmuyor ama ikinci dokümanı saklamak için
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">Çekici Kayıt</p>
            <h1 className="text-lg font-bold">Onboarding</h1>
          </div>
          <button
            type="button"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
            aria-label="Geri"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </header>

        <div className="space-y-2">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-orange-500' : 'bg-slate-800'}`} />
            ))}
          </div>
          <p className="text-xs text-slate-500">{STEPS[step] ?? ''}</p>
        </div>

        {done ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="font-semibold">Başvurun alındı</p>
            <p className="text-sm text-slate-500">Admin onayı sonrası hesabın aktif olacak.</p>
            <button
              type="button"
              onClick={() => router.push('/cekici')}
              className="w-full py-3 rounded-2xl bg-orange-500 text-white font-semibold"
            >
              Ana sayfaya dön
            </button>
          </div>
        ) : (
          <>
            {step === 0 && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ad Soyad</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    placeholder="Ad Soyad"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Telefon</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    placeholder="05xx..."
                    inputMode="tel"
                  />
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Araç tipi</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cekici', label: 'Çekici' },
                      { id: 'kurtarici', label: 'Kurtarıcı' },
                      { id: 'flatbed', label: 'Flatbed' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicleType(v.id as VehicleType)}
                        className={`px-3 py-3 rounded-2xl border text-sm font-semibold ${
                          vehicleType === v.id
                            ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                            : 'border-slate-800 bg-slate-950/30 text-slate-300'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Plaka</label>
                  <input
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    placeholder="34 ABC 123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vinç kapasitesi (ton)</label>
                  <input
                    value={craneTons}
                    onChange={(e) => setCraneTons(e.target.value)}
                    className="w-full rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    placeholder="3"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Kayar kasa var mı?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHasSlidingBed(true)}
                      className={`flex-1 py-3 rounded-2xl border font-semibold ${
                        hasSlidingBed === true
                          ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                          : 'border-slate-800 bg-slate-950/30 text-slate-300'
                      }`}
                    >
                      Evet
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasSlidingBed(false)}
                      className={`flex-1 py-3 rounded-2xl border font-semibold ${
                        hasSlidingBed === false
                          ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                          : 'border-slate-800 bg-slate-950/30 text-slate-300'
                      }`}
                    >
                      Hayır
                    </button>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <UploadField
                  label="Ruhsat fotoğrafı"
                  valueName={regName}
                  onPick={(f) => {
                    setRegFile(f)
                    setRegName(f?.name || '')
                  }}
                />
                <UploadField
                  label="Ehliyet fotoğrafı"
                  valueName={licenseName}
                  onPick={(f) => {
                    setLicenseFile(f)
                    setLicenseName(f?.name || '')
                  }}
                />
                <p className="text-xs text-slate-500">
                  Dosyalar `documents` bucket&apos;ına yüklenecek.
                </p>
              </section>
            )}

            {step === 3 && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-400">Şehirler (çoklu seçim)</p>
                  <span className="text-xs text-slate-500">{cities.length} seçili</span>
                </div>
                <input
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  placeholder="Şehir ara..."
                />
                <div className="max-h-64 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/30 p-2">
                  <div className="flex flex-wrap gap-2">
                    {filteredCities.map((c) => {
                      const active = cities.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCity(c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            active
                              ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                              : 'border-slate-800 bg-slate-950/30 text-slate-300'
                          }`}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
                <label className="block text-xs font-semibold text-slate-400">IBAN</label>
                <input
                  value={iban}
                  onChange={(e) => setIban(clampText(e.target.value.replace(/\s+/g, ''), 34))}
                  className="w-full rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
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
                  className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  Devam <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={save}
                  disabled={!canNext || saving}
                  className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
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
}: {
  label: string
  valueName: string
  onPick: (f: File | null) => void
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-400 mb-2">{label}</span>
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-4 flex items-center justify-between gap-3 cursor-pointer hover:border-orange-500/50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">
            {valueName ? valueName : 'Dosya seç'}
          </p>
          <p className="text-xs text-slate-500">JPG/PNG/WebP</p>
        </div>
        <UploadCloud className="w-6 h-6 text-orange-400" />
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  )
}

