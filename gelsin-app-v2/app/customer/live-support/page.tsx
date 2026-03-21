'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  JITSI_DOMAIN,
  parseJitsiRoomName,
  loadJitsiScript,
  getJitsiMeetEmbedOptions,
  type JitsiApi,
} from '@/lib/jitsi-embed'

type CategoryItem = {
  id: string
  label: string
  icon: string
}

/** Görüşme bitince: Keşfet = /customer | Gelen teklifler = /customer/jobs?tab=offers */
const AFTER_HANGUP_HREF = '/customer/jobs?tab=offers'

function LiveSupportPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSessionId = searchParams.get('session_id') || ''

  const [step, setStep] = useState<'category' | 'payment' | 'waiting' | 'video'>(() =>
    initialSessionId ? 'waiting' : 'category'
  )
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [roomUrl, setRoomUrl] = useState('')
  const [customerCity, setCustomerCity] = useState('')
  const [customerDisplayName, setCustomerDisplayName] = useState('Müşteri')
  const [loading, setLoading] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{ token: string; merchantOid: string } | null>(
    null
  )
  const [handledPaytrSuccess, setHandledPaytrSuccess] = useState(false)
  const [jitsiConnecting, setJitsiConnecting] = useState(true)

  const jitsiParentRef = useRef<HTMLDivElement>(null)
  const jitsiApiRef = useRef<JitsiApi | null>(null)
  const hangupNavigatedRef = useRef(false)

  const navigateAfterHangup = useCallback(() => {
    if (hangupNavigatedRef.current) return
    hangupNavigatedRef.current = true
    try {
      jitsiApiRef.current?.dispose()
    } catch {
      /* ignore */
    }
    jitsiApiRef.current = null
    router.push(AFTER_HANGUP_HREF)
  }, [router])

  const finalizePaidSession = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
    } catch {
      /* ignore */
    }

    const label =
      categories.find((c) => c.id === selectedCategoryId)?.label || selectedCategoryId || '-'

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
        message: `${label} kategorisinde müşteri video görüşmesi bekliyor. 150₺ danışmanlık ücreti garantili.`,
        data: { session_id: sessionId },
        read: false,
        created_at: new Date().toISOString(),
      }))
      await supabase.from('notifications').insert(notifications)
    }

    setStep('waiting')
    setLoading(false)
  }, [sessionId, selectedCategoryId, categories])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'paytr-live-support-success') {
        if (handledPaytrSuccess) return
        setHandledPaytrSuccess(true)
        setPaymentModal(null)
        void finalizePaidSession()
      }
      if (e.data?.type === 'paytr-live-support-fail') {
        setPaymentModal(null)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [handledPaytrSuccess, finalizePaidSession])

  useEffect(() => {
    if (step === 'video') hangupNavigatedRef.current = false
  }, [step])

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
    const loadProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, city')
        .eq('id', user.id)
        .single()
      const raw = (profile as { full_name?: string } | null)?.full_name?.trim()
      if (raw) {
        const first = raw.split(/\s+/)[0]
        setCustomerDisplayName(first || raw)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    const loadCustomerCity = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('city').eq('id', user.id).single()

      if ((profile as any)?.city) {
        setCustomerCity((profile as any).city as string)
      } else {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords

            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=tr`
            )
            const data = await res.json()

            const city =
              data.address?.province ||
              data.address?.city ||
              data.address?.town ||
              data.address?.state

            if (city) {
              setCustomerCity(city)
              await supabase.from('profiles').update({ city: city }).eq('id', user.id)
            }
          },
          (err) => {
            console.log('Konum alınamadı:', err)
          }
        )
      }
    }
    loadCustomerCity()
  }, [])

  useEffect(() => {
    try {
      const sid =
        searchParams.get('session_id') || localStorage.getItem('live_support_session_id') || ''
      if (sid) {
        localStorage.setItem('live_support_session_id', sid)
        setSessionId(sid)
        setStep('waiting')
      }
    } catch {
      /* ignore */
    }
  }, [searchParams])

  useEffect(() => {
    if (step !== 'waiting' || !sessionId) return

    const supabase = createClient()

    supabase
      .from('live_sessions')
      .select('status, room_url')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => {
        if (data?.status === 'provider_joined' && data?.room_url) {
          setRoomUrl(data.room_url)
          setStep('video')
        }
      })

    const channel = supabase
      .channel('session_' + sessionId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: 'id=eq.' + sessionId,
        },
        (payload) => {
          if (payload.new.status === 'provider_joined' && payload.new.room_url) {
            setRoomUrl(payload.new.room_url as string)
            setStep('video')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [step, sessionId])

  /** Jitsi: prejoin yok, isim otomatik, minimal araç çubuğu */
  useEffect(() => {
    if (step !== 'video' || !roomUrl) return

    const roomName = parseJitsiRoomName(roomUrl)
    if (!roomName || !jitsiParentRef.current) {
      console.error('Jitsi oda adı çözülemedi:', roomUrl)
      return
    }

    let cancelled = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    setJitsiConnecting(true)

    ;(async () => {
      try {
        await loadJitsiScript()
        if (cancelled || !jitsiParentRef.current) return
        const API = window.JitsiMeetExternalAPI
        if (!API) throw new Error('JitsiMeetExternalAPI yok')

        jitsiParentRef.current.innerHTML = ''

        const embedOpts = getJitsiMeetEmbedOptions(customerDisplayName)
        const api = new API(JITSI_DOMAIN, {
          roomName,
          parentNode: jitsiParentRef.current,
          ...embedOpts,
        })

        jitsiApiRef.current = api

        const onJoined = () => {
          if (!cancelled) setJitsiConnecting(false)
        }

        api.addEventListeners({
          videoConferenceJoined: onJoined,
          readyToClose: () => navigateAfterHangup(),
          videoConferenceLeft: () => navigateAfterHangup(),
        })

        fallbackTimer = setTimeout(() => {
          if (!cancelled) setJitsiConnecting(false)
        }, 20000)
      } catch (e) {
        console.error('Jitsi başlatılamadı:', e)
        if (!cancelled) setJitsiConnecting(false)
      }
    })()

    return () => {
      cancelled = true
      if (fallbackTimer) clearTimeout(fallbackTimer)
      try {
        jitsiApiRef.current?.dispose()
      } catch {
        /* ignore */
      }
      jitsiApiRef.current = null
      if (jitsiParentRef.current) jitsiParentRef.current.innerHTML = ''
    }
  }, [step, roomUrl, customerDisplayName, navigateAfterHangup])

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('live_sessions')
        .insert({
          customer_id: user.id,
          category: selectedCategoryId,
          customer_city: customerCity,
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
      } catch {
        /* ignore */
      }

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

  return (
    <>
      {step === 'video' && roomUrl ? (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-slate-950 sm:bg-slate-900 sm:p-4 md:p-6">
          <div
            className="relative flex h-[100dvh] w-full max-w-[1200px] flex-1 overflow-hidden bg-black shadow-xl sm:h-[min(92dvh,calc(100dvh-2rem))] sm:rounded-2xl sm:ring-1 sm:ring-white/10"
          >
            {jitsiConnecting && (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 px-6 text-center"
                aria-live="polite"
                aria-busy="true"
              >
                <p className="text-2xl font-bold tracking-tight text-white">
                  GELSİN<span className="text-blue-400">.</span>
                </p>
                <p className="mt-5 max-w-xs text-base font-medium text-slate-300">
                  Uzmanımıza bağlanıyorsunuz...
                </p>
                <div
                  className="mt-10 h-9 w-9 rounded-full border-2 border-slate-600 border-t-blue-500 animate-spin"
                  aria-hidden
                />
              </div>
            )}
            <div ref={jitsiParentRef} className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      ) : (
        <div className="mx-auto min-h-screen max-w-lg bg-white px-6">
          <div className="flex items-center justify-between pb-6 pt-14">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              ← Geri
            </button>
            <span className="flex items-center gap-2 text-xs font-bold text-green-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Canlı Destek
            </span>
          </div>

          {step === 'category' && (
            <div>
              <h1 className="mb-2 text-3xl font-black tracking-tight text-gray-900">
                Ne hakkında
                <br />
                yardım lazım?
              </h1>
              <p className="mb-8 text-sm text-gray-400">Bir uzmanla anında video görüşmesi başlat.</p>
              {!customerCity && (
                <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
                  <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-transparent" />
                  Konumunuz alınıyor...
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className="rounded-2xl border-2 border-gray-100 p-5 text-left transition-all hover:border-orange-400 hover:bg-orange-50 active:scale-95"
                  >
                    <span className="mb-3 block text-3xl">{cat.icon}</span>
                    <span className="text-sm font-bold text-gray-900">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div>
              <h1 className="mb-2 text-3xl font-black tracking-tight text-gray-900">
                Danışmanlık
                <br />
                ücreti
              </h1>
              <p className="mb-8 text-sm text-gray-400">Uzman seni dinleyecek, sorunu teşhis edecek.</p>

              <div className="mb-6 rounded-2xl bg-gray-50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Seçilen kategori</span>
                  <span className="text-sm font-bold capitalize text-gray-900">{selectedCategoryLabel}</span>
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Danışmanlık ücreti</span>
                  <span className="text-2xl font-black text-gray-900">₺150</span>
                </div>
                <div className="my-4 h-px bg-gray-200" />
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-700">
                    💡 Bu ücreti aynı uzmanla işi gerçekleştirirsen toplam fiyattan düşeceğiz.
                  </p>
                </div>
              </div>

              <div className="mb-8 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="font-bold text-green-500">✓</span>
                  Anında uzman bağlantısı
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="font-bold text-green-500">✓</span>
                  Video ile yerinde teşhis
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="font-bold text-green-500">✓</span>
                  Bağlantı kurulamazsa tam iade
                </div>
              </div>

              <button
                type="button"
                onClick={handlePayment}
                disabled={loading}
                className="w-full rounded-2xl bg-orange-500 py-5 text-base font-bold text-white disabled:opacity-50"
              >
                {loading ? 'İşleniyor...' : '₺150 Öde & Uzman Ara →'}
              </button>

              <button
                type="button"
                onClick={() => setStep('category')}
                className="mt-3 w-full py-3 text-sm text-gray-400"
              >
                Geri dön
              </button>
            </div>
          )}

          {step === 'waiting' && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-orange-100">
                <span className="text-4xl">🔍</span>
              </div>
              <h2 className="mb-3 text-2xl font-black text-gray-900">Uzman Aranıyor</h2>
              <p className="mb-8 max-w-xs text-sm text-gray-400">
                Online uzmanlar bildirim aldı. Biri kabul ettiğinde video görüşmesi otomatik başlayacak.
              </p>
              <div className="mb-8 flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-orange-400"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <div className="w-full max-w-sm rounded-2xl bg-gray-50 p-5 text-left">
                <p className="mb-1 text-xs text-gray-400">Session ID</p>
                <p className="truncate font-mono text-xs text-gray-600">{sessionId}</p>
              </div>
            </div>
          )}

          {paymentModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
              onClick={() => !loading && setPaymentModal(null)}
            >
              <div
                className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Güvenli Ödeme – PayTR</p>
                  <button
                    type="button"
                    onClick={() => setPaymentModal(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                    aria-label="Kapat"
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <iframe
                    src={`https://www.paytr.com/odeme/guvenli/${paymentModal.token}`}
                    className="h-[600px] w-full border-0"
                    allow="payment"
                    title="PayTR ödeme"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default function LiveSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      }
    >
      <LiveSupportPageInner />
    </Suspense>
  )
}
