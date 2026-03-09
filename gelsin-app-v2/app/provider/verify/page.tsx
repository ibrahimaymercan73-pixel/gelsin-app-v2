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
        if (data.error) setFaceError(data.error)
        return
      }
      setFaceInFrame(true)
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

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col">
      <div className="w-full px-4 py-4 flex items-center justify-between bg-white border-b border-slate-200/60">
        <button
          type="button"
          onClick={() => router.replace('/provider')}
          className="text-slate-600 hover:text-slate-900 font-medium text-sm flex items-center gap-1"
        >
          ← Geri
        </button>
        <h1 className="text-lg font-bold text-slate-900">Kimlik Doğrulama</h1>
        <div className="w-14" />
      </div>

      <main className="flex-1 px-4 py-6 pb-28 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <canvas ref={canvasRef} className="hidden" />
        {showSuccessScreen ? (
          <div className="rounded-3xl bg-slate-900 p-8 flex flex-col items-center justify-center min-h-[320px] w-full">
            <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-scale-in">
              <Check className="w-12 h-12 stroke-[3]" strokeWidth={3} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white mt-6 text-center">Kimliğiniz Doğrulandı! 🎉</p>
            <p className="text-emerald-400 font-medium mt-2 text-center">Onaylı Uzman rozetini kazandınız</p>
            <p className="text-slate-400 text-sm mt-4">Yönlendiriliyorsunuz...</p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-slate-900 p-6 flex flex-col items-center w-full">
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
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className={`inline-block w-2.5 h-2.5 rounded-full transition-all ${
                      i < livenessStep ? 'bg-emerald-500' : i === livenessStep ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                ))}
              </div>
              <div className="mt-6 min-h-[4rem] flex flex-col items-center justify-center text-white">
                {livenessStep === 0 && <p className="text-lg font-bold animate-pulse">Sağa Bakın →</p>}
                {livenessStep === 1 && <p className="text-lg font-bold animate-pulse">← Sola Bakın</p>}
                {livenessStep === 2 && <p className="text-lg font-bold animate-pulse">Düz Bakın</p>}
                {livenessStep >= 3 && (
                  <p className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <Check className="w-6 h-6" /> Doğrulandı
                  </p>
                )}
              </div>
            </div>
            {!faceInFrame && cameraOn && livenessStep < 3 && (
              <p className="text-center text-amber-400 text-sm font-medium mt-3">Yüzünüzü çerçevede tutun</p>
            )}
            {faceError && (
              <p className="text-center text-red-400 text-sm font-medium mt-3">{faceError}</p>
            )}
            {livenessTimeout && (
              <div className="mt-3 space-y-2 w-full">
                <p className="text-center text-amber-400 text-sm">Süre doldu, tekrar deneyin</p>
                <button
                  type="button"
                  onClick={() => {
                    setLivenessTimeout(false)
                    setLivenessStep(0)
                    setFaceError('')
                    startCamera()
                  }}
                  className="w-full py-3 rounded-xl border-2 border-amber-400 text-amber-400 font-semibold text-sm"
                >
                  Tekrar dene
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={skipFaceVerify}
              className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 rounded-2xl text-sm"
            >
              Şimdi Değil
            </button>
          </>
        )}
      </main>

      {!showSuccessScreen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex justify-center pb-[env(safe-area-inset-bottom,16px)]">
          <button
            type="button"
            onClick={() => router.replace('/provider')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
          >
            ← Geri
          </button>
        </div>
      )}
    </div>
  )
}
