'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/lib/constants'
import { ChevronLeft, Check, Camera } from 'lucide-react'

export default function ProviderOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [faceError, setFaceError] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [livenessStep, setLivenessStep] = useState(0)
  const [livenessTimeout, setLivenessTimeout] = useState(false)
  const [faceInFrame, setFaceInFrame] = useState(true)
  const [verifyingRequest, setVerifyingRequest] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const step3StartRef = useRef<number>(0)
  const livenessStepRef = useRef(0)
  livenessStepRef.current = livenessStep

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/onboarding')
        return
      }

      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('service_categories, main_category')
        .eq('id', user.id)
        .single()

      if (pp?.main_category) {
        const cat = SERVICE_CATEGORIES.find(c => c.id === pp.main_category)
        if (cat) {
          setSelectedCategory(cat)
          setStep(2)
        }
      }
      if (pp?.service_categories) {
        setSelectedServices(pp.service_categories as string[])
      }
      setLoading(false)
    }

    load()
  }, [router])

  useEffect(() => {
    if (step === 3) {
      startCamera()
    }
    return () => {
      if (step === 3) stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startCamera/stopCamera stable enough
  }, [step])

  useEffect(() => {
    if (step !== 3 || !cameraOn || livenessTimeout || livenessStep >= 3) return
    const t = setTimeout(() => setLivenessTimeout(true), 30_000)
    timeoutRef.current = t
    const id = setInterval(captureFrameAndVerify, 1000)
    pollIntervalRef.current = id
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- captureFrameAndVerify uses refs
  }, [step, cameraOn, livenessTimeout, livenessStep])

  useEffect(() => {
    if (livenessStep !== 3) return
    stopCamera()
    setShowSuccessScreen(true)
  }, [livenessStep])

  useEffect(() => {
    if (!showSuccessScreen) return
    const t = setTimeout(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ face_verified: true }).eq('id', user.id)
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/provider'
      } else {
        router.replace('/provider')
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [showSuccessScreen, router])

  const selectMainCategory = (cat: ServiceCategory) => {
    setSelectedCategory(cat)
    setSelectedServices([])
    setStep(2)
  }

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    )
  }

  const goBack = () => {
    if (step === 3) {
      stopCamera()
      setStep(2)
      setFaceError('')
    } else if (step === 2) {
      setStep(1)
      setSelectedCategory(null)
      setSelectedServices([])
    } else {
      router.back()
    }
  }

  const save = async () => {
    if (!selectedCategory || selectedServices.length === 0) {
      alert('Lütfen en az bir hizmet seçin.')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/onboarding')
      return
    }

    const { error } = await supabase
      .from('provider_profiles')
      .update({
        main_category: selectedCategory.id,
        service_categories: selectedServices,
        is_onboarded: true,
      })
      .eq('id', user.id)

    if (error) {
      setSaving(false)
      alert('Kaydedilemedi: ' + error.message)
      return
    }
    setSaving(false)
    setStep(3)
  }

  const startCamera = async () => {
    setFaceError('')
    setLivenessTimeout(false)
    setLivenessStep(0)
    setShowSuccessScreen(false)
    setFaceInFrame(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraOn(true)
      step3StartRef.current = Date.now()
    } catch (e) {
      setFaceError('Kamera açılamadı. Tarayıcı izni verin.')
    }
  }

  const stopCamera = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraOn(false)
  }

  const captureFrameAndVerify = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.srcObject || video.readyState < 2 || verifyingRequest) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.restore()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const base64 = dataUrl.split(',')[1] || ''
    setVerifyingRequest(true)
    try {
      const res = await fetch('/api/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })
      const data = await res.json().catch(() => ({}))
      console.log('[onboarding] verify-face response:', { status: res.status, data })

      if (res.status === 429) {
        setFaceError(data.error || 'Çok fazla istek. Bir dakika bekleyin.')
        return
      }

      if (!data.verified) {
        setFaceInFrame(false)
        if (data.error) setFaceError(data.error)
        return
      }

      setFaceInFrame(true)
      setFaceError('')
      const headEulerAngleY = Number(data.headEulerAngleY) || 0
      const correctedAngle = headEulerAngleY * -1
      const current = livenessStepRef.current
      if (current === 0 && correctedAngle > 15) {
        setLivenessStep(1)
      } else if (current === 1 && correctedAngle < -15) {
        setLivenessStep(2)
      } else if (current === 2 && correctedAngle >= -10 && correctedAngle <= 10) {
        setLivenessStep(3)
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Beklenmeyen hata'
      setFaceError('Bir hata oluştu: ' + errMsg)
    } finally {
      setVerifyingRequest(false)
    }
  }

  const skipFaceVerify = () => {
    stopCamera()
    if (typeof window !== 'undefined') {
      window.location.href = '/provider'
      return
    }
    router.replace('/provider')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#F4F7FA]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F4F7FA] flex flex-col">
      <header className="px-4 sm:px-6 lg:px-10 pt-6 sm:pt-10 pb-4 border-b border-slate-200/60 bg-white">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm font-medium mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Geri
        </button>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em]">
          Adım {step} / 3
        </p>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 mt-2">
          {step === 1
            ? 'Hangi alanda hizmet veriyorsun?'
            : step === 2
              ? 'Hangi hizmetleri sunuyorsun?'
              : 'Kimliğini Doğrula'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-2xl">
          {step === 1
            ? 'Önce ana uzmanlık alanını seç. Müşteriler seni bu kategoride bulacak.'
            : step === 2
              ? `"${selectedCategory?.name}" kategorisinden sunduğun hizmetleri seç.`
              : 'Selfie çekerek hesabını doğrula. Onaylı uzman rozeti alırsın.'}
        </p>
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 pb-32">
        <div className="max-w-4xl mx-auto">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-slide-up">
              {SERVICE_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectMainCategory(cat)}
                    className="group p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-blue-500 hover:shadow-lg text-left transition-all flex items-start gap-4"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 transition-colors flex-shrink-0">
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm sm:text-base">
                        {cat.name}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2">
                        {cat.sub.slice(0, 3).join(', ')}
                        {cat.sub.length > 3 && '...'}
                      </p>
                    </div>
                    <span className="text-slate-300 group-hover:text-blue-500 text-xl transition-colors">›</span>
                  </button>
                )
              })}
            </div>
          )}

          {step === 2 && selectedCategory && (
            <div className="space-y-6 animate-slide-up">
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  {(() => {
                    const Icon = selectedCategory.icon
                    return <Icon className="w-6 h-6" />
                  })()}
                </div>
                <div>
                  <p className="font-bold text-blue-900">{selectedCategory.name}</p>
                  <p className="text-xs text-blue-700">Ana kategori seçildi</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">
                  Sunduğun hizmetleri seç ({selectedServices.length} seçili)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {selectedCategory.sub.map((service) => {
                    const isSelected = selectedServices.includes(service)
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? 'text-blue-900' : 'text-slate-700'
                          }`}
                        >
                          {service}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={save}
                disabled={saving || selectedServices.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-blue-600/25 disabled:shadow-none transition-all"
              >
                {saving ? 'Kaydediliyor...' : `✓ ${selectedServices.length} Hizmetle Kaydet ve Devam Et`}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-slide-up max-w-sm mx-auto">
              <canvas ref={canvasRef} className="hidden" />

              {showSuccessScreen ? (
                <div className="rounded-3xl bg-slate-900 p-8 flex flex-col items-center justify-center min-h-[320px]">
                  <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-scale-in">
                    <Check className="w-12 h-12 stroke-[3]" strokeWidth={3} />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-white mt-6 text-center">
                    Kimliğiniz Doğrulandı! ✓
                  </p>
                  <p className="text-emerald-400 font-medium mt-2 text-center">
                    Onaylı Uzman rozetini kazandınız 🎉
                  </p>
                  <p className="text-slate-400 text-sm mt-4">Yönlendiriliyorsunuz...</p>
                </div>
              ) : (
              <div className="rounded-3xl bg-slate-900 p-6 flex flex-col items-center">
                <div
                  className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 transition-colors duration-300 ${
                    !cameraOn ? 'border-slate-500 bg-slate-800' : livenessStep >= 3 ? 'border-emerald-500' : 'border-blue-500'
                  }`}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-full"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {!cameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Camera className="w-12 h-12" />
                      <span className="text-xs font-medium">Kamera açılıyor...</span>
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none rounded-full border-2 border-white/30" />
                  {cameraOn && (
                    <>
                      <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-white/60 rounded-tl-lg animate-pulse" />
                      <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-white/60 rounded-tr-lg animate-pulse" />
                      <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-white/60 rounded-bl-lg animate-pulse" />
                      <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-white/60 rounded-br-lg animate-pulse" />
                    </>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 mt-6">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`inline-block w-2.5 h-2.5 rounded-full transition-all ${
                        i < livenessStep ? 'bg-emerald-500' : i === livenessStep ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-6 min-h-[4rem] flex flex-col items-center justify-center">
                  {livenessStep === 0 && (
                    <p className="text-lg sm:text-xl font-bold text-white animate-pulse">
                      Sağa Bakın →
                    </p>
                  )}
                  {livenessStep === 1 && (
                    <p className="text-lg sm:text-xl font-bold text-white animate-pulse">
                      ← Sola Bakın
                    </p>
                  )}
                  {livenessStep === 2 && (
                    <p className="text-lg sm:text-xl font-bold text-white animate-pulse">
                      Düz Bakın
                    </p>
                  )}
                  {livenessStep >= 3 && (
                    <p className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                      <Check className="w-6 h-6" /> Doğrulandı
                    </p>
                  )}
                  {livenessStep > 0 && (
                    <p className="text-sm text-slate-400 mt-1">
                      {livenessStep >= 1 && '✓ Sağa baktınız '}
                      {livenessStep >= 2 && '✓ Sola baktınız '}
                      {livenessStep >= 3 && '✓ Düz baktınız'}
                    </p>
                  )}
                </div>
              </div>

              {!faceInFrame && cameraOn && livenessStep < 3 && (
                <p className="text-center text-amber-400 text-sm font-medium bg-amber-500/10 border border-amber-500/30 rounded-xl py-2 px-4">
                  Yüzünüzü çerçevede tutun
                </p>
              )}
              {faceError && (
                <p className="text-center text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/30 rounded-xl py-2 px-4">
                  {faceError}
                </p>
              )}
              {livenessTimeout && (
                <div className="space-y-2">
                  <p className="text-center text-amber-400 text-sm font-medium">
                    Süre doldu, tekrar deneyin
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLivenessTimeout(false)
                      setLivenessStep(0)
                      setFaceError('')
                      step3StartRef.current = Date.now()
                      startCamera()
                    }}
                    className="w-full py-3 rounded-xl border-2 border-amber-400 text-amber-400 font-semibold text-sm hover:bg-amber-500/10 transition-colors"
                  >
                    Tekrar dene
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={skipFaceVerify}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 rounded-2xl text-sm transition-all"
              >
                Şimdi Değil
              </button>
              <p className="text-xs text-slate-500 text-center">
                Atlarsan onaylı uzman rozeti almazsın; istersen sonra profilinden doğrulayabilirsin.
              </p>
            </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
