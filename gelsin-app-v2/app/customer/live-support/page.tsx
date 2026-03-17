'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type CategoryItem = {
  id: string
  label: string
  icon: string
}

export default function LiveSupportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSessionId = searchParams.get('session_id') || ''
  const videoRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<'category' | 'payment' | 'waiting' | 'video'>(() =>
    initialSessionId ? 'waiting' : 'category'
  )
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [roomUrl, setRoomUrl] = useState('')
  const [customerCity, setCustomerCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{ token: string; merchantOid: string } | null>(
    null
  )
  const [handledPaytrSuccess, setHandledPaytrSuccess] = useState(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'paytr-live-support-success') {
        if (handledPaytrSuccess) return
        setHandledPaytrSuccess(true)
        setPaymentModal(null)
        finalizePaidSession()
      }
      if (e.data?.type === 'paytr-live-support-fail') {
        setPaymentModal(null)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [handledPaytrSuccess])

  useEffect(() => {
    const loadCategories = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('service_categories')
        .select('id, name, icon')
        .order('name', { ascending: true })
      if (data && data.length > 0) {
        setCategories(
          data.map((c: any) => ({
            id: c.id as string,
            label: (c.name as string) ?? '',
            icon: (c.icon as string) ?? '🛠️',
          }))
        )
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    const loadCustomerCity = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .maybeSingle()

      if (!error) {
        const city = (data as any)?.city
        if (typeof city === 'string' && city.trim()) setCustomerCity(city.trim())
        return
      }

      const { data: fallback } = await supabase
        .from('provider_profiles')
        .select('city')
        .eq('id', user.id)
        .maybeSingle()

      const city = (fallback as any)?.city
      if (typeof city === 'string' && city.trim()) setCustomerCity(city.trim())
    }
    loadCustomerCity()
  }, [])

  useEffect(() => {
    try {
      const sid =
        searchParams.get('session_id') ||
        localStorage.getItem('live_support_session_id') ||
        ''
      if (sid) {
        localStorage.setItem('live_support_session_id', sid)
        setSessionId(sid)
        setStep('waiting')
      }
    } catch {}
  }, [searchParams])

  useEffect(() => {
    if (step !== 'waiting' || !sessionId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`live_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          // @ts-ignore - runtime payload from Supabase
          if (payload.new.status === 'provider_joined' && payload.new.room_url) {
            // @ts-ignore
            setRoomUrl(payload.new.room_url as string)
            setStep('video')
            channel.unsubscribe()
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [step, sessionId])

  useEffect(() => {
    if (step === 'video' && roomUrl && videoRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const DailyIframe = require('@daily-co/daily-js')
      const callFrame = DailyIframe.createFrame(videoRef.current, {
        showLeaveButton: true,
        showFullscreenButton: true,
      })
      callFrame.join({ url: roomUrl })
      return () => {
        callFrame.destroy()
      }
    }
  }, [step, roomUrl])

  const selectedCategoryLabel =
    categories.find((c) => c.id === selectedCategoryId)?.label || selectedCategoryId || '-'

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id)
    setStep('payment')
  }

  const handlePayment = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('live_sessions')
        .insert({
          customer_id: user.id,
          category: selectedCategoryId,
          customer_city: customerCity || null,
          status: 'payment_pending',
          consultation_fee: 150,
          fee_paid: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('live_sessions insert hatası:', error)
        alert('Hata: ' + error.message)
        setLoading(false)
        return
      }

      if (!data?.id) {
        setLoading(false)
        return
      }

      setSessionId(data.id)
      try {
        localStorage.setItem('live_support_session_id', data.id as string)
      } catch {}

      const res = await fetch('/api/paytr/create-live-support-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error('PayTR token hatası:', err)
        alert('Ödeme başlatılamadı: ' + err)
        setLoading(false)
        return
      }
      const paytrData: any = await res.json().catch(() => ({}))
      if (!paytrData?.token) {
        setLoading(false)
        return
      }
      setPaymentModal({
        token: paytrData.token as string,
        merchantOid: paytrData.merchant_oid as string,
      })
    } catch {
      // no-op
    } finally {
      setLoading(false)
    }
  }

  const finalizePaidSession = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    if (!sessionId) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('live_sessions')
      .update({
        fee_paid: true,
        status: 'waiting_provider',
      })
      .eq('id', sessionId)
      .eq('customer_id', user.id)
      .select()
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }

    try {
      localStorage.setItem('live_support_session_id', sessionId)
    } catch {}

    const { data: providers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'provider')
      .eq('is_online', true)

    if (providers && providers.length > 0) {
      const notifications = providers.map((p: { id: string }) => ({
        user_id: p.id,
        type: 'live_session_request',
        title: '🔴 Canlı Destek Talebi!',
        message: `${selectedCategoryLabel} kategorisinde müşteri video görüşmesi bekliyor. 150₺ danışmanlık ücreti garantili.`,
        data: { session_id: sessionId },
        read: false,
        created_at: new Date().toISOString(),
      }))
      await supabase.from('notifications').insert(notifications)
    }

    setStep('waiting')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto px-6">
      <div className="flex items-center justify-between pt-14 pb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 font-semibold text-sm flex items-center gap-2"
        >
          ← Geri
        </button>
        <span className="flex items-center gap-2 text-xs font-bold text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Canlı Destek
        </span>
      </div>

      {step === 'category' && (
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
            Ne hakkında
            <br />
            yardım lazım?
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            Bir uzmanla anında video görüşmesi başlat.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="border-2 border-gray-100 rounded-2xl p-5 text-left hover:border-orange-400 hover:bg-orange-50 transition-all active:scale-95"
              >
                <span className="text-3xl mb-3 block">{cat.icon}</span>
                <span className="text-sm font-bold text-gray-900">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'payment' && (
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
            Danışmanlık
            <br />
            ücreti
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            Uzman seni dinleyecek, sorunu teşhis edecek.
          </p>

          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">Seçilen kategori</span>
              <span className="text-sm font-bold text-gray-900 capitalize">
                {selectedCategoryLabel}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">Danışmanlık ücreti</span>
              <span className="text-2xl font-black text-gray-900">₺150</span>
            </div>
            <div className="h-px bg-gray-200 my-4" />
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-700 font-semibold">
                💡 Bu ücreti aynı uzmanla işi gerçekleştirirsen toplam fiyattan düşeceğiz.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="text-green-500 font-bold">✓</span>
              Anında uzman bağlantısı
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="text-green-500 font-bold">✓</span>
              Video ile yerinde teşhis
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="text-green-500 font-bold">✓</span>
              Bağlantı kurulamazsa tam iade
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-orange-500 text-white rounded-2xl py-5 text-base font-bold disabled:opacity-50"
          >
            {loading ? 'İşleniyor...' : '₺150 Öde & Uzman Ara →'}
          </button>

          <button
            onClick={() => setStep('category')}
            className="w-full mt-3 text-gray-400 text-sm py-3"
          >
            Geri dön
          </button>
        </div>
      )}

      {step === 'waiting' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6 animate-pulse">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Uzman Aranıyor</h2>
          <p className="text-sm text-gray-400 mb-8 max-w-xs">
            Online uzmanlar bildirim aldı. Biri kabul ettiğinde video görüşmesi otomatik başlayacak.
          </p>
          <div className="flex gap-2 mb-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 w-full max-w-sm text-left">
            <p className="text-xs text-gray-400 mb-1">Session ID</p>
            <p className="text-xs font-mono text-gray-600 truncate">{sessionId}</p>
          </div>
        </div>
      )}

      {step === 'video' && roomUrl && (
        <div>
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Uzman Bağlandı! 🎉
          </h2>
          <div
            ref={videoRef}
            className="rounded-2xl overflow-hidden border border-gray-200 mb-4"
            style={{ height: '500px', width: '100%' }}
          />
        </div>
      )}

      {paymentModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => !loading && setPaymentModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <p className="font-semibold text-slate-900 text-sm">Güvenli Ödeme – PayTR</p>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
                aria-label="Kapat"
                disabled={loading}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`https://www.paytr.com/odeme/guvenli/${paymentModal.token}`}
                className="w-full h-[600px] border-0"
                allow="payment"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

