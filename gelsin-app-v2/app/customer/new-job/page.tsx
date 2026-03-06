'use client'
import { useState, useEffect, Suspense, ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/lib/constants'
import { ChevronLeft, ChevronDown, Camera } from 'lucide-react'

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
          files.map(async (file, index) => {
            const ext = file.name.split('.').pop() || 'file'
            const path = `${user.id}/${Date.now()}-${index}.${ext}`
            const { error: uploadError } = await supabase.storage.from('job-media').upload(path, file)
            if (uploadError) throw uploadError
            const { data } = supabase.storage.from('job-media').getPublicUrl(path)
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
        category_id: selectedCategory.id,
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
    <div className="min-h-dvh bg-white">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-4 sm:px-5 pt-10 sm:pt-14 pb-5 sm:pb-6 text-white">
        <button
          onClick={goBack}
          className="text-blue-300 hover:text-white text-sm mb-3 sm:mb-4 flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Geri
        </button>
        <h1 className="text-xl sm:text-2xl font-black">
          {step === 0 && 'Neye İhtiyacın Var?'}
          {step === 1 && 'Hangi Hizmeti İstiyorsun?'}
          {step === 2 && 'İş Detayları'}
        </h1>
        <div className="flex gap-2 mt-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-5 py-5 sm:py-6 pb-32 max-w-3xl mx-auto">
        {/* STEP 0: Ana Kategori Seçimi */}
        {step === 0 && (
          <div className="space-y-3 animate-slide-up">
            <p className="text-sm text-slate-500 mb-4">Önce ana kategori seçin:</p>
            {SERVICE_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => selectMainCategory(cat)}
                  className="w-full bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.99] transition-all"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm sm:text-base">{cat.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {cat.sub.slice(0, 3).join(', ')}
                      {cat.sub.length > 3 && '...'}
                    </p>
                  </div>
                  <span className="text-slate-300 text-xl">›</span>
                </button>
              )
            })}
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

