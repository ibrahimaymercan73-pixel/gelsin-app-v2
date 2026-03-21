'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { SERVICE_CATEGORIES, CITIES, type ServiceCategory } from '@/lib/constants'
import { ChevronLeft, Check, Camera, User, Briefcase, ShieldCheck } from 'lucide-react'

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
}

const STEP_CONFIG = [
  { icon: Briefcase, label: 'Rol' },
  { icon: User, label: 'Bilgiler' },
  { icon: Briefcase, label: 'Hizmetler' },
  { icon: ShieldCheck, label: 'Kimlik' },
]

export default function ChooseRolePage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [direction, setDirection] = useState(1)
  const [role, setRole] = useState<'customer' | 'provider' | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [faceError, setFaceError] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [livenessStep, setLivenessStep] = useState(0)
  const [livenessTimeout, setLivenessTimeout] = useState(false)
  const [faceInFrame, setFaceInFrame] = useState(true)
  const [hasFace, setHasFace] = useState(false)
  const [verifyingRequest, setVerifyingRequest] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const livenessStepRef = useRef(0)
  livenessStepRef.current = livenessStep

  const totalSteps = role === 'provider' ? 4 : 2
  const visibleStepLabels = STEP_CONFIG.slice(0, totalSteps)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const [{ data: profile }, { data: pp }] = await Promise.all([
        supabase.from('profiles').select('role, full_name, phone, city').eq('id', user.id).single(),
        supabase.from('provider_profiles').select('service_categories, main_category, is_onboarded').eq('id', user.id).single(),
      ])
      const currentRole = (profile?.role as 'customer' | 'provider' | 'admin' | null) ?? null
      const hasCity = !!(profile?.city && String(profile.city).trim())
      const isOnboarded = !!pp?.is_onboarded
      const hasServices = Array.isArray(pp?.service_categories) && (pp.service_categories as string[]).length > 0

      if (currentRole === 'admin') {
        router.push('/admin')
        return
      }
      if (currentRole === 'customer' && hasCity) {
        router.replace('/customer')
        return
      }
      if (currentRole === 'provider' && isOnboarded && hasServices) {
        router.replace('/provider')
        return
      }

      setFullName((profile?.full_name as string) || '')
      setPhone((profile?.phone as string) || '')
      setCity((profile?.city as string) || '')
      let effectiveRole = currentRole
      if (!effectiveRole && typeof window !== 'undefined') {
        try {
          const pending = sessionStorage.getItem('gelsin_register_role') as 'customer' | 'provider' | null
          if (pending === 'customer' || pending === 'provider') {
            effectiveRole = pending
            sessionStorage.removeItem('gelsin_register_role')
            await supabase.from('profiles').upsert({ id: user.id, role: pending }, { onConflict: 'id' })
          }
        } catch {
          /* ignore */
        }
      }
      if (effectiveRole) setRole(effectiveRole)
      if (pp?.main_category) {
        const cat = SERVICE_CATEGORIES.find(c => c.id === pp.main_category)
        if (cat) setSelectedCategory(cat)
      }
      if (pp?.service_categories) setSelectedServices((pp.service_categories as string[]) || [])

      if (!effectiveRole) setStep(1)
      else if (!hasCity) setStep(2)
      else if (effectiveRole === 'provider' && !isOnboarded) setStep(3)
      else if (effectiveRole === 'provider' && isOnboarded) setStep(4)
      else setStep(2)
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (step === 4) startCamera()
    return () => { if (step === 4) stopCamera() }
  }, [step])

  useEffect(() => {
    if (step !== 4 || !cameraOn || livenessTimeout || livenessStep >= 3) return
    const t = setTimeout(() => setLivenessTimeout(true), 30_000)
    timeoutRef.current = t
    const id = setInterval(captureFrameAndVerify, 1000)
    pollIntervalRef.current = id
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
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
        const { data: existing } = await supabase.from('profiles').select('role, face_verified').eq('id', user.id).single()
        if (existing?.role && existing?.face_verified) {
          if (typeof window !== 'undefined') window.location.href = '/provider'
          else router.replace('/provider')
          return
        }
        await supabase.from('profiles').update({ face_verified: true }).eq('id', user.id)
        await supabase.from('provider_profiles').update({ status: 'approved' }).eq('id', user.id)
      }
      if (typeof window !== 'undefined') window.location.href = '/provider'
      else router.replace('/provider')
    }, 2000)
    return () => clearTimeout(t)
  }, [showSuccessScreen, router])

  const normalizePhone = (raw: string) => raw.replace(/\s/g, '').replace(/^\+90/, '0')
  const isValidPhone = (p: string) => /^0[0-9]{10}$/.test(normalizePhone(p))

  const canProceedStep1 = () => role !== null
  const canProceedStep2 = () =>
    fullName.trim().length >= 2 && isValidPhone(phone) && city.trim().length > 0

  const goNext = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (step === 1 && canProceedStep1()) {
      setDirection(1)
      setStep(2)
      return
    }

    if (step === 2 && canProceedStep2()) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (existingProfile?.role) {
        if (existingProfile.role === 'customer') router.replace('/customer')
        else if (existingProfile.role === 'provider') router.replace('/provider')
        else if (existingProfile.role === 'admin') router.replace('/admin')
        return
      }
      const trimmedPhone = normalizePhone(phone.trim())
      await supabase.from('profiles').update({
        full_name: fullName.trim(),
        phone: trimmedPhone || null,
        city: city.trim() || null,
        role: role!,
      }).eq('id', user.id)
      if (role === 'customer') {
        router.replace('/customer')
        return
      }
      setDirection(1)
      setStep(3)
      return
    }

    if (step === 3 && selectedCategory && selectedServices.length > 0) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (existingProfile?.role === 'provider') {
        const { data: pp } = await supabase.from('provider_profiles').select('is_onboarded').eq('id', user.id).single()
        if (pp?.is_onboarded) {
          router.replace('/provider')
          return
        }
      }
      setSaving(true)
      await supabase.from('provider_profiles').upsert(
        { id: user.id, main_category: selectedCategory.id, service_categories: selectedServices, is_onboarded: true },
        { onConflict: 'id' }
      )
      setSaving(false)
      setDirection(1)
      setStep(4)
    }
  }

  const goBack = () => {
    setDirection(-1)
    if (step === 4) {
      stopCamera()
      setStep(3)
      setFaceError('')
    } else if (step === 3) {
      setStep(2)
      setSelectedCategory(null)
      setSelectedServices([])
    } else if (step === 2) setStep(1)
    else router.back()
  }

  const selectMainCategory = (cat: ServiceCategory) => {
    setSelectedCategory(cat)
    setSelectedServices([])
  }

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    )
  }

  const startCamera = async () => {
    setFaceError('')
    setLivenessTimeout(false)
    setLivenessStep(0)
    setShowSuccessScreen(false)
    setFaceInFrame(true)
    setHasFace(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch {
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
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
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
      if (res.status === 429) {
        setFaceError(data.error || 'Çok fazla istek. Bir dakika bekleyin.')
        return
      }
      if (!data.verified) {
        setFaceInFrame(false)
        setHasFace(false)
        if (data.error) setFaceError(data.error)
        return
      }
      setFaceInFrame(true)
      setHasFace(true)
      setFaceError('')
      const headEulerAngleY = Number(data.headEulerAngleY) || 0
      const correctedAngle = headEulerAngleY * -1
      const current = livenessStepRef.current
      if (current === 0 && correctedAngle < -15) setLivenessStep(1)
      else if (current === 1 && correctedAngle > 15) setLivenessStep(2)
      else if (current === 2 && correctedAngle >= -10 && correctedAngle <= 10) setLivenessStep(3)
    } catch (e) {
      setFaceError('Bir hata oluştu: ' + (e instanceof Error ? e.message : 'Beklenmeyen hata'))
    } finally {
      setVerifyingRequest(false)
    }
  }

  const skipFaceVerify = () => {
    stopCamera()
    if (typeof window !== 'undefined') window.location.href = '/provider'
    else router.replace('/provider')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F7FA]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const progressPercent = (step / totalSteps) * 100

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col overflow-hidden">
      <div className="w-full px-4 sm:px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200/60">
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          GELSİN<span className="text-blue-600">.</span>
        </h1>
        <span className="text-sm text-slate-500 font-medium">Adım {step} / {totalSteps}</span>
      </div>

      <div className="w-full h-1 bg-slate-200">
        <motion.div
          className="h-full bg-blue-600"
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-6 py-4 bg-white">
        {visibleStepLabels.map((s, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3 | 4
          const isActive = step === stepNum
          const isDone = step > stepNum
          const Icon = s.icon
          return (
            <div key={stepNum} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone ? 'bg-step-completed text-white' : isActive ? 'bg-step-active text-white scale-110 shadow-lg shadow-blue-500/30' : 'bg-step-inactive text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      <main className="flex-1 overflow-hidden px-4 sm:px-6 py-6 pb-28">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-md mx-auto flex flex-col items-center"
            >
              <Image src="/images/onboard-role.png" alt="Rol" width={256} height={176} className="object-contain mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-1">Ne Yapmak İstiyorsun?</h2>
              <p className="text-slate-500 text-center mb-6 max-w-sm text-sm">Rolünü seçerek devam et.</p>
              <div className="w-full grid grid-cols-2 gap-4">
                {[
                  { id: 'customer' as const, emoji: '🏠', title: 'Hizmet Al', desc: 'Güvenilir uzmanlar arıyorum' },
                  { id: 'provider' as const, emoji: '🔧', title: 'Hizmet Ver', desc: 'İş alıp kazanç sağlamak istiyorum' },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-center text-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${
                      role === r.id ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-500/10 scale-[1.02]' : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <span className="text-4xl">{r.emoji}</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{r.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
                    </div>
                    {role === r.id && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-md mx-auto flex flex-col items-center"
            >
              <Image src="/images/onboard-profile.png" alt="Profil" width={256} height={176} className="object-contain mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-1">Kendini Tanıt</h2>
              <p className="text-slate-500 text-center mb-6 max-w-sm text-sm">Adını, telefonunu ve şehrini gir.</p>
              <div className="w-full space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Adınız ve Soyadınız</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="input w-full h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefon Numaranız</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      if (val.length <= 11) setPhone(val)
                    }}
                    placeholder="05XX XXX XX XX"
                    className="input w-full h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Şehir</label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="input w-full h-12 rounded-xl [color-scheme:light]"
                  >
                    <option value="">Şehir seçiniz...</option>
                    {CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && role === 'provider' && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-2xl mx-auto"
            >
              <Image src="/images/onboard-role.png" alt="Hizmet" width={256} height={176} className="object-contain mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-1">Hangi İşleri Yapıyorsun?</h2>
              <p className="text-slate-500 text-center mb-6 text-sm">Kategori ve hizmetleri seç.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {SERVICE_CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectMainCategory(cat)}
                      className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                        selectedCategory?.id === cat.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{cat.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{cat.sub.slice(0, 2).join(', ')}...</p>
                      </div>
                      {selectedCategory?.id === cat.id && <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
              {selectedCategory && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700">Sunduğun hizmetler ({selectedServices.length} seçili)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedCategory.sub.map(svc => {
                      const isSelected = selectedServices.includes(svc)
                      return (
                        <button
                          key={svc}
                          type="button"
                          onClick={() => toggleService(svc)}
                          className={`p-3 rounded-xl border-2 text-left flex items-center gap-2 transition-all ${
                            isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                          <span className="text-sm font-medium text-slate-800">{svc}</span>
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={saving || selectedServices.length === 0}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl text-sm transition-all"
                  >
                    {saving ? 'Kaydediliyor...' : `${selectedServices.length} Hizmetle Devam Et`}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && role === 'provider' && (
            <motion.div
              key="step4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              layout
              className="w-full max-w-md mx-auto min-h-[520px]"
            >
              <canvas ref={canvasRef} className="hidden" />
              {showSuccessScreen ? (
                <div className="rounded-3xl bg-slate-950 p-8 flex flex-col items-center justify-center min-h-[360px] border border-white/10">
                  <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-scale-in">
                    <Check className="w-12 h-12 stroke-[3]" strokeWidth={3} />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-white mt-6 text-center">Kimliğiniz Doğrulandı! 🎉</p>
                  <p className="text-emerald-400 font-medium mt-2 text-center">Onaylı Uzman rozetini kazandınız</p>
                  <p className="text-slate-400 text-sm mt-4">Yönlendiriliyorsunuz...</p>
                </div>
              ) : (
                <>
                  {(() => {
                    const ringMode: 'idle' | 'active' | 'success' =
                      livenessStep >= 3 ? 'success' : hasFace ? 'active' : 'idle'
                    const ringGradient =
                      ringMode === 'success'
                        ? 'conic-gradient(from 180deg, #22c55e, #16a34a, #4ade80, #22c55e)'
                        : ringMode === 'active'
                          ? 'conic-gradient(from 180deg, #60a5fa, #2563eb, #93c5fd, #2563eb, #60a5fa)'
                          : 'conic-gradient(from 180deg, #475569, #334155, #64748b, #334155, #475569)'
                    const ringShadow =
                      ringMode === 'success'
                        ? '0 0 20px rgba(34,197,94,0.45)'
                        : ringMode === 'active'
                          ? '0 0 20px rgba(59,130,246,0.5)'
                          : '0 0 18px rgba(148,163,184,0.22)'
                    const stepItems = [
                      { key: 0, label: '→', title: 'Sağa', desc: 'Yavaşça sağa doğru çevirin' },
                      { key: 1, label: '←', title: 'Sola', desc: 'Yavaşça sola doğru çevirin' },
                      { key: 2, label: '↑', title: 'Düz', desc: 'Kameraya düz bakın' },
                    ] as const
                    const activeStep = Math.min(livenessStep, 2)
                    return (
                      <div className="rounded-3xl bg-slate-950 border border-white/10 overflow-hidden">
                        <div className="p-6 flex flex-col items-center">
                          <div className="relative w-72 h-72 sm:w-80 sm:h-80">
                            <div className="absolute inset-0 rounded-full" style={{ boxShadow: ringShadow }}>
                              <div
                                className="absolute inset-0 rounded-full animate-liveness-spin-slow"
                                style={{ backgroundImage: ringGradient }}
                              />
                              <div
                                className="absolute inset-0 rounded-full animate-liveness-spin"
                                style={{
                                  backgroundImage:
                                    ringMode === 'success'
                                      ? 'radial-gradient(circle at top, rgba(255,255,255,0.45), transparent 55%)'
                                      : ringMode === 'active'
                                        ? 'radial-gradient(circle at top, rgba(255,255,255,0.55), transparent 55%)'
                                        : 'radial-gradient(circle at top, rgba(255,255,255,0.25), transparent 55%)',
                                  mixBlendMode: 'screen',
                                }}
                              />
                              <div className="absolute inset-[4px] rounded-full bg-slate-950 overflow-hidden">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full h-full object-cover"
                                  style={{ transform: 'scaleX(-1)' }}
                                />
                                {!cameraOn && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                                    <Camera className="w-12 h-12" />
                                    <span className="text-xs font-medium">Kamera açılıyor...</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 pointer-events-none rounded-full ring-1 ring-white/10" />
                                {cameraOn && (
                                  <>
                                    <div className="absolute top-5 left-5 w-5 h-5 border-l-[3px] border-t-[3px] border-white/80 animate-pulse" />
                                    <div className="absolute top-5 right-5 w-5 h-5 border-r-[3px] border-t-[3px] border-white/80 animate-pulse" />
                                    <div className="absolute bottom-5 left-5 w-5 h-5 border-l-[3px] border-b-[3px] border-white/80 animate-pulse" />
                                    <div className="absolute bottom-5 right-5 w-5 h-5 border-r-[3px] border-b-[3px] border-white/80 animate-pulse" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5">
                          <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur px-5 py-4 space-y-3">
                            <div className="flex items-center justify-center gap-3">
                              {stepItems.map((s, idx) => {
                                const done = livenessStep > idx
                                const active = livenessStep === idx
                                return (
                                  <div
                                    key={s.key}
                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg border transition-all ${
                                      done
                                        ? 'bg-emerald-500 border-emerald-400 text-white'
                                        : active
                                          ? 'bg-blue-600 border-blue-400 text-white animate-pulse'
                                          : 'bg-slate-800 border-white/10 text-slate-300'
                                    }`}
                                    title={s.title}
                                  >
                                    {done ? <Check className="w-6 h-6" /> : s.label}
                                  </div>
                                )
                              })}
                            </div>

                            <div key={livenessStep} className="text-center animate-fade-in">
                              <p className="text-xl font-black text-white">
                                {livenessStep === 0 && 'Sağa Bakın →'}
                                {livenessStep === 1 && '← Sola Bakın'}
                                {livenessStep === 2 && 'Düz Bakın'}
                                {livenessStep >= 3 && 'Doğrulandı'}
                              </p>
                              <p className="text-sm text-slate-300 mt-1">{stepItems[activeStep]?.desc}</p>
                            </div>

                            {!faceInFrame && cameraOn && livenessStep < 3 && (
                              <p className="text-center text-amber-300 text-sm font-medium">Yüzünüzü çerçevede tutun</p>
                            )}
                            {faceError && (
                              <p className="text-center text-rose-300 text-sm font-medium">{faceError}</p>
                            )}
                            {livenessTimeout && (
                              <div className="space-y-2">
                                <p className="text-center text-amber-300 text-sm">Süre doldu, tekrar deneyin</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLivenessTimeout(false)
                                    setLivenessStep(0)
                                    setFaceError('')
                                    startCamera()
                                  }}
                                  className="w-full py-3 rounded-2xl border border-amber-300/40 text-amber-200 font-semibold text-sm bg-amber-300/10 hover:bg-amber-300/15"
                                >
                                  Tekrar dene
                                </button>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={skipFaceVerify}
                              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm"
                            >
                              Şimdi Değil
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      {step <= 2 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4 pb-[env(safe-area-inset-bottom,16px)]">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
          >
            <ChevronLeft className="w-5 h-5" /> Geri
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={
              (step === 1 && !canProceedStep1()) ||
              (step === 2 && !canProceedStep2())
            }
            className="flex-1 max-w-[200px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-all"
          >
            Devam Et
          </button>
        </div>
      )}
      {step === 3 && role === 'provider' && !selectedCategory && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4 pb-[env(safe-area-inset-bottom,16px)]">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
          >
            <ChevronLeft className="w-5 h-5" /> Geri
          </button>
        </div>
      )}
      {step === 4 && role === 'provider' && !showSuccessScreen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur border-t border-white/10 flex justify-center pb-[env(safe-area-inset-bottom,16px)]">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-slate-200 hover:bg-white/10 font-semibold"
          >
            <ChevronLeft className="w-5 h-5" /> Geri
          </button>
        </div>
      )}
    </div>
  )
}
