'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Check, Camera } from 'lucide-react'

export default function ProviderVerifyPage() {
  const router = useRouter()
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

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (!cameraOn || livenessTimeout || livenessStep >= 3) return
    const t = setTimeout(() => setLivenessTimeout(true), 30_000)
    timeoutRef.current = t
    const id = setInterval(captureFrameAndVerify, 1000)
    pollIntervalRef.current = id
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [cameraOn, livenessTimeout, livenessStep])

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
        const { data: existing } = await supabase.from('profiles').select('face_verified').eq('id', user.id).single()
        if (existing?.face_verified) {
          router.replace('/provider')
          return
        }
        await supabase.from('profiles').update({ face_verified: true }).eq('id', user.id)
        await supabase.from('provider_profiles').update({ status: 'approved' }).eq('id', user.id)
      }
      router.replace('/provider')
    }, 2000)
    return () => clearTimeout(t)
  }, [showSuccessScreen, router])

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
    router.replace('/provider')
  }

  const ringMode: 'idle' | 'active' | 'success' = livenessStep >= 3 ? 'success' : hasFace ? 'active' : 'idle'
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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="w-full px-4 py-4 flex items-center justify-between bg-transparent">
        <button
          type="button"
          onClick={() => router.replace('/provider')}
          className="text-slate-200 hover:text-white font-medium text-sm flex items-center gap-1"
        >
          ← Geri
        </button>
        <h1 className="text-lg font-bold text-white">Kimlik Doğrulama</h1>
        <div className="w-14" />
      </div>

      <main className="flex-1 px-4 py-6 flex flex-col items-center justify-center w-full">
        <canvas ref={canvasRef} className="hidden" />
        {showSuccessScreen ? (
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur p-8 flex flex-col items-center justify-center min-h-[320px] w-full max-w-md">
            <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-scale-in">
              <Check className="w-12 h-12 stroke-[3]" strokeWidth={3} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white mt-6 text-center">Kimliğiniz Doğrulandı! 🎉</p>
            <p className="text-emerald-400 font-medium mt-2 text-center">Onaylı Uzman rozetini kazandınız</p>
            <p className="text-slate-400 text-sm mt-4">Yönlendiriliyorsunuz...</p>
          </div>
        ) : (
          <>
            <div className="w-full flex-1 flex flex-col items-center justify-center">
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

            <div className="w-full max-w-md rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur px-5 py-4 space-y-3">
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
                <p className="text-sm text-slate-300 mt-1">
                  {stepItems[activeStep]?.desc}
                </p>
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
          </>
        )}
      </main>

      {!showSuccessScreen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur border-t border-white/10 flex justify-center pb-[env(safe-area-inset-bottom,16px)]">
          <button
            type="button"
            onClick={() => router.replace('/provider')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-slate-200 hover:bg-white/10 font-semibold"
          >
            ← Geri
          </button>
        </div>
      )}
    </div>
  )
}
