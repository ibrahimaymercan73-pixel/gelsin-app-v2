'use client'
import { useState, useEffect, Suspense, ChangeEvent, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/lib/constants'
import { ChevronLeft, Camera } from 'lucide-react'

/** Kategori kartları — renkli daire + ikon (Getir / Airbnb tarzı) */
const CATEGORY_THEME: Record<string, { circle: string; iconClass: string }> = {
  ev_yasam: {
    circle: 'bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_4px_14px_-4px_rgba(14,165,233,0.65)]',
    iconClass: 'text-white',
  },
  arac_yol: {
    circle: 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_4px_14px_-4px_rgba(249,115,22,0.55)]',
    iconClass: 'text-white',
  },
  guzellik: {
    circle: 'bg-gradient-to-br from-fuchsia-400 to-pink-500 shadow-[0_4px_14px_-4px_rgba(236,72,153,0.5)]',
    iconClass: 'text-white',
  },
  egitim: {
    circle: 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_4px_14px_-4px_rgba(124,58,237,0.5)]',
    iconClass: 'text-white',
  },
  evcil_hayvan: {
    circle: 'bg-gradient-to-br from-pink-400 to-rose-500 shadow-[0_4px_14px_-4px_rgba(244,63,94,0.45)]',
    iconClass: 'text-white',
  },
  teknoloji: {
    circle: 'bg-gradient-to-br from-slate-600 to-slate-900 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.45)]',
    iconClass: 'text-white',
  },
  kurumsal: {
    circle: 'bg-gradient-to-br from-slate-500 to-blue-900 shadow-[0_4px_14px_-4px_rgba(30,58,138,0.4)]',
    iconClass: 'text-white',
  },
  bahce_peyzaj: {
    circle: 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_4px_14px_-4px_rgba(20,184,166,0.5)]',
    iconClass: 'text-white',
  },
}

const defaultCategoryTheme = {
  circle: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md',
  iconClass: 'text-white',
}

// Dinamik Placeholder Haritası - Kategoriye göre değişen ipuçları
const CATEGORY_PLACEHOLDERS: Record<string, { title: string; description: string; address: string }> = {
  ev_yasam: {
    title: 'Ör: Mutfak musluğu damlatıyor',
    description: 'Sorunu ve yapılacak işlemi kısaca anlatın...',
    address: 'Mahalle, sokak, bina no...',
  },
  arac_yol: {
    title: 'Ör: Aracım çalışmıyor, akü bitti',
    description: 'Aracın markasını, modelini ve bulunduğu konumu belirtin...',
    address: 'Aracın bulunduğu adres veya yol bilgisi...',
  },
  guzellik: {
    title: 'Ör: Gelin saçı ve makyajı',
    description: 'İstediğiniz modeli, tarih/saat tercihlerinizi ve detayları belirtin...',
    address: 'Hizmet alınacak adres...',
  },
  egitim: {
    title: 'Ör: Lise 1 Matematik Özel Ders',
    description: 'Öğrencinin seviyesini, işlenecek konuları ve ders saati tercihlerinizi belirtin...',
    address: 'Ders yapılacak adres...',
  },
  evcil_hayvan: {
    title: 'Ör: Köpek gezdirme hizmeti',
    description: 'Hayvanınızın türü, yaşı ve özel ihtiyaçlarını belirtin...',
    address: 'Evinizin adresi...',
  },
  teknoloji: {
    title: 'Ör: Laptop açılmıyor, ekran kararıyor',
    description: 'Cihazın markası, modeli ve yaşadığınız sorunu detaylı anlatın...',
    address: 'Cihazın bulunduğu adres...',
  },
  kurumsal: {
    title: 'Ör: Ofis dezenfeksiyonu ve ilaçlama',
    description: 'İşyerinizin büyüklüğü, hizmet kapsamı ve tarih/saat tercihlerinizi belirtin...',
    address: 'İşyeri adresi...',
  },
  bahce_peyzaj: {
    title: 'Ör: Bahçe düzenleme, çim biçme',
    description: 'Bahçe büyüklüğü, yapılacak işler ve tercih edilen tarih/saat...',
    address: 'Bahçe adresi...',
  },
  default: {
    title: 'Ör: İhtiyacınızı kısaca yazın',
    description: 'Detayları kısaca açıklayın...',
    address: 'Hizmet alınacak adres...',
  },
}

// Fotoğraf yükleme alanının gizleneceği kategoriler
const HIDE_PHOTO_CATEGORIES = ['guzellik', 'egitim', 'kurumsal']

function NewJobForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCatId = searchParams.get('cat') || ''

  const [step, setStep] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [selectedSubService, setSelectedSubService] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [address, setAddress] = useState('')
  const [jobType, setJobType] = useState<'urgent' | 'scheduled'>('urgent')
  const [lat, setLat] = useState(41.0082)
  const [lng, setLng] = useState(28.9784)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([])

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      setLat(p.coords.latitude)
      setLng(p.coords.longitude)
    })
    if (defaultCatId) {
      const cat = SERVICE_CATEGORIES.find(c => c.id === defaultCatId)
      if (cat) {
        setSelectedCategory(cat)
        setStep(1)
      }
    }
  }, [defaultCatId])

  // State Reset: Kategori değiştiğinde form alanlarını temizle
  const resetFormFields = () => {
    setTitle('')
    setDesc('')
    setAddress('')
    setJobType('urgent')
    setFiles([])
    setPreviews(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.url))
      return []
    })
  }

  useEffect(() => {
    if (selectedCategory && step === 1) {
      resetFormFields()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?.id])

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return

    const maxFiles = 3
    const remainingSlots = maxFiles - files.length
    if (remainingSlots <= 0) {
      alert('En fazla 3 adet dosya ekleyebilirsiniz.')
      return
    }

    const allowed: File[] = []
    for (const file of selected) {
      if (allowed.length >= remainingSlots) break
      if (file.size > 10 * 1024 * 1024) {
        alert(`"${file.name}" 10MB sınırını aşıyor ve eklenmedi.`)
        continue
      }
      allowed.push(file)
    }

    if (!allowed.length) {
      e.target.value = ''
      return
    }

    const nextFiles = [...files, ...allowed].slice(0, maxFiles)
    const nextPreviews = [...previews]

    for (const file of allowed) {
      const url = URL.createObjectURL(file)
      const isVideo = file.type.startsWith('video/')
      nextPreviews.push({ url, type: isVideo ? 'video' : 'image', name: file.name })
    }

    setFiles(nextFiles)
    setPreviews(nextPreviews.slice(0, maxFiles))
    e.target.value = ''
  }

  const removeFileAt = (index: number) => {
    const nextFiles = files.filter((_, i) => i !== index)
    const nextPreviews = previews.filter((p, i) => {
      if (i === index) {
        URL.revokeObjectURL(p.url)
        return false
      }
      return true
    })
    setFiles(nextFiles)
    setPreviews(nextPreviews)
  }

  const selectMainCategory = (cat: ServiceCategory) => {
    setSelectedCategory(cat)
    setSelectedSubService('')
    setStep(1)
  }

  const goBack = () => {
    if (step === 2) {
      resetFormFields()
      setStep(1)
    } else if (step === 1) {
      setSelectedSubService('')
      setSelectedCategory(null)
      setStep(0)
    } else {
      router.back()
    }
  }

  const proceedToDetails = () => {
    if (!selectedSubService) {
      alert('Lütfen bir hizmet türü seçin.')
      return
    }
    setStep(2)
  }

  const submit = async () => {
    if (!selectedCategory) {
      alert('Lütfen bir kategori seçin.')
      return
    }
    if (!selectedSubService) {
      alert('Lütfen bir hizmet türü seçin.')
      return
    }
    if (!title.trim()) {
      alert('Lütfen iş başlığı girin.')
      return
    }
    if (!address.trim()) {
      alert('Lütfen adres girin.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
      setLoading(false)
      return
    }
    const qrToken = crypto.randomUUID()

    let mediaUrls: string[] = []
    if (files.length > 0) {
      try {
        const uploads = await Promise.all(
          files.map(async (file) => {
            const form = new FormData()
            form.append('file', file)
            form.append('bucket', 'job-media')
            const res = await fetch('/api/upload', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Yükleme başarısız')
            return data.publicUrl
          })
        )
        mediaUrls = uploads
      } catch (err: any) {
        console.error('MEDYA YÜKLEME HATASI:', err)
        alert('Medya yüklenemedi: ' + (err?.message || 'Bilinmeyen hata'))
        setLoading(false)
        return
      }
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        customer_id: user.id,
        main_category: selectedCategory.id,
        sub_service: selectedSubService,
        title,
        description: desc,
        address,
        lat,
        lng,
        job_type: jobType,
        qr_token: qrToken,
        status: 'open',
        media_urls: mediaUrls.length ? mediaUrls : null,
      })
      .select()
      .single()

    if (error || !job) {
      console.error('INSERT HATASI:', error)
      alert('İş oluşturulamadı: ' + error?.message)
      setLoading(false)
      return
    }

    router.replace(`/customer/jobs/${job.id}`)
  }

  const totalSteps = 3

  return (
    <div className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-slate-50 font-sans antialiased">
      <header className="relative w-full max-w-[100vw] overflow-hidden border-b border-white/10 bg-gradient-to-br from-blue-600 via-blue-800 to-indigo-950 text-white shadow-[0_12px_40px_-20px_rgba(30,58,138,0.55)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 20% -20%, #fff 0%, transparent 55%),
              radial-gradient(ellipse 60% 50% at 100% 0%, #93c5fd 0%, transparent 45%)`,
          }}
          aria-hidden
        />
        <div className="relative px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-7">
          <button
            type="button"
            onClick={goBack}
            className="mb-3 flex items-center gap-1 text-sm font-medium text-blue-100/90 transition-colors hover:text-white sm:mb-4"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            Geri
          </button>
          <h1 className="max-w-xl text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm sm:text-[1.65rem]">
            {step === 0 && 'Neye İhtiyacın Var?'}
            {step === 1 && 'Hangi Hizmeti İstiyorsun?'}
            {step === 2 && 'İş Detayları'}
          </h1>
          {/* Step indicator */}
          <div className="mt-4 flex w-full max-w-md items-center">
            {[0, 1, 2].map((i) => (
              <Fragment key={i}>
                <div className="flex shrink-0 flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums transition-all duration-300 ${
                      i < step
                        ? 'border-white/90 bg-white text-blue-700 shadow-md shadow-blue-950/20'
                        : i === step
                          ? 'scale-110 border-white bg-white text-blue-800 shadow-lg shadow-blue-950/25 ring-2 ring-white/40'
                          : 'border-white/35 bg-white/[0.12] text-white/80 backdrop-blur-[2px]'
                    }`}
                    aria-current={i === step ? 'step' : undefined}
                  >
                    {i < step ? (
                      <span className="text-[13px] leading-none" aria-hidden>
                        ✓
                      </span>
                    ) : (
                      i + 1
                    )}
                  </div>
                </div>
                {i < 2 && (
                  <div
                    className={`mx-2 h-[3px] min-w-[1.25rem] flex-1 rounded-full transition-colors duration-300 ${
                      step > i ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.35)]' : 'bg-white/25'
                    }`}
                    aria-hidden
                  />
                )}
              </Fragment>
            ))}
          </div>
          <p className="mt-3 hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/70 sm:block">
            <span className={step === 0 ? 'text-white' : ''}>Kategori</span>
            <span className="mx-2 text-white/40">·</span>
            <span className={step === 1 ? 'text-white' : ''}>Hizmet</span>
            <span className="mx-2 text-white/40">·</span>
            <span className={step === 2 ? 'text-white' : ''}>Detay</span>
          </p>
        </div>
      </header>

      <div className="mx-auto box-border w-full min-w-0 max-w-3xl px-4 py-6 pb-32 sm:px-6 sm:py-8">
        {/* STEP 0: Ana Kategori Seçimi — servis grid */}
        {step === 0 && (
          <div className="animate-slide-up">
            <p className="mb-4 text-sm font-medium text-slate-500">
              Hangi alanda yardıma ihtiyacın var? Bir kategori seç.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {SERVICE_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const theme = CATEGORY_THEME[cat.id] ?? defaultCategoryTheme
                const preview = cat.sub.slice(0, 2).join(' · ')
                const more = cat.sub.length > 2 ? ' +' : ''
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectMainCategory(cat)}
                    className="group flex flex-col items-stretch rounded-3xl border border-slate-100/90 bg-white p-4 text-left shadow-[0_10px_40px_-18px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_22px_48px_-20px_rgba(15,23,42,0.22)] active:scale-[0.98] sm:p-5"
                  >
                    <div
                      className={`mb-3 flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full ${theme.circle}`}
                    >
                      <Icon className={`h-7 w-7 ${theme.iconClass}`} strokeWidth={2} aria-hidden />
                    </div>
                    <p className="text-[15px] font-bold leading-snug text-slate-900 sm:text-base">{cat.name}</p>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500 sm:text-[13px]">
                      {preview}
                      {more}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 1: Alt Hizmet Seçimi */}
        {step === 1 && selectedCategory && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-3 sm:p-4 rounded-2xl">
              {(() => {
                const Icon = selectedCategory.icon
                return (
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                )
              })()}
              <div>
                <p className="font-bold text-blue-900 text-sm">{selectedCategory.name}</p>
                <p className="text-xs text-blue-700">Ana kategori</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-3">Hangi hizmete ihtiyacın var?</p>
              <div className="space-y-2">
                {selectedCategory.sub.map((service) => {
                  const isSelected = selectedSubService === service
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => setSelectedSubService(service)}
                      className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                        {service}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={proceedToDetails}
              disabled={!selectedSubService}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-2xl text-sm transition-all"
            >
              Devam Et →
            </button>
          </div>
        )}

        {/* STEP 2: İş Detayları */}
        {step === 2 && selectedCategory && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-3 rounded-2xl">
              {(() => {
                const Icon = selectedCategory.icon
                return (
                  <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                )
              })()}
              <div className="min-w-0">
                <p className="font-bold text-blue-900 text-sm truncate">{selectedCategory.name}</p>
                <p className="text-xs text-blue-700 truncate">{selectedSubService}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['urgent', 'scheduled'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setJobType(t)}
                  className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition-all ${
                    jobType === t ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="text-xl sm:text-2xl mb-1">{t === 'urgent' ? '⚡' : '📅'}</div>
                  <p className="font-bold text-xs sm:text-sm text-slate-900">
                    {t === 'urgent' ? 'Acil' : 'Randevulu'}
                  </p>
                </button>
              ))}
            </div>

            {/* Dinamik Placeholder'lı Form Alanları */}
            {(() => {
              const catId = selectedCategory?.id || 'default'
              const placeholders = CATEGORY_PLACEHOLDERS[catId] || CATEGORY_PLACEHOLDERS.default
              const showPhotoUpload = !HIDE_PHOTO_CATEGORIES.includes(catId)

              return (
                <>
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-1.5 block">İş Başlığı *</label>
                    <input
                      className="input"
                      placeholder={placeholders.title}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-1.5 block">Açıklama</label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      placeholder={placeholders.description}
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                    />
                  </div>

                  {/* Fotoğraf Yükleme - Sadece uygun kategorilerde göster */}
                  {showPhotoUpload && (
                    <div>
                      <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-slate-500" />
                        Fotoğraf / Video Ekle
                        <span className="text-xs font-normal text-slate-400">(İsteğe Bağlı, max 3 adet)</span>
                      </label>
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-2xl p-4 bg-slate-50/50 transition-colors">
                        <label className="flex flex-col items-center justify-center gap-2 text-center text-sm text-slate-500 cursor-pointer">
                          <span className="text-2xl">📷</span>
                          <span className="font-medium text-slate-600">Fotoğraf veya video ekle</span>
                          <span className="text-[10px] text-slate-400">JPEG, PNG, MP4 (max 10MB)</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={handleFilesChange}
                          />
                        </label>
                        {previews.length > 0 && (
                          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                            {previews.map((p, index) => (
                              <div
                                key={p.url}
                                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-blue-100 bg-black/5 flex-shrink-0"
                              >
                                {p.type === 'video' ? (
                                  <video src={p.url} className="w-full h-full object-cover" muted playsInline />
                                ) : (
                                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeFileAt(index)}
                                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-1.5 block">Adres *</label>
                    <input
                      className="input"
                      placeholder={placeholders.address}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </>
              )
            })()}

            <button
              className="btn-primary"
              onClick={submit}
              disabled={loading || !title || !address}
            >
              {loading ? 'Yayınlanıyor...' : '🚀 İşi Yayınla'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NewJobPage() {
  return (
    <Suspense>
      <NewJobForm />
    </Suspense>
  )
}

