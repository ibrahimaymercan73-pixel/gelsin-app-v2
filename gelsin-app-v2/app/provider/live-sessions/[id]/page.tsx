'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  JITSI_DOMAIN,
  parseJitsiRoomName,
  loadJitsiScript,
  getJitsiMeetEmbedBundle,
  type JitsiApi,
} from '@/lib/jitsi-embed'

const AFTER_PROVIDER_HANGUP = '/provider/live-sessions'

function ProviderLiveSessionRoomInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [providerDisplayName, setProviderDisplayName] = useState<string | null>(null)
  const [jitsiConnecting, setJitsiConnecting] = useState(true)
  const [jitsiVideoVisible, setJitsiVideoVisible] = useState(false)

  const jitsiParentRef = useRef<HTMLDivElement>(null)
  const jitsiApiRef = useRef<JitsiApi | null>(null)
  const hangupNavigatedRef = useRef(false)

  const id = params?.id as string

  const navigateAfterHangup = useCallback(() => {
    if (hangupNavigatedRef.current) return
    hangupNavigatedRef.current = true
    try {
      jitsiApiRef.current?.dispose()
    } catch {
      /* ignore */
    }
    jitsiApiRef.current = null
    router.push(AFTER_PROVIDER_HANGUP)
  }, [router])

  useEffect(() => {
    if (id && id !== 'undefined') {
      setError(null)
      setSessionLoading(true)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setProviderDisplayName('Uzman')
        return
      }
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (cancelled) return
      const raw = (data as { full_name?: string } | null)?.full_name?.trim()
      if (raw) {
        const first = raw.split(/\s+/)[0]
        setProviderDisplayName(first || raw)
      } else {
        setProviderDisplayName('Uzman')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const existingRoom = searchParams.get('room')
    const load = async () => {
      if (!id || id === 'undefined') {
        setError('Oturum bulunamadı.')
        setSessionLoading(false)
        return
      }

      if (existingRoom) {
        setRoomUrl(existingRoom)
        setSessionLoading(false)
        return
      }

      const supabase = createClient()
      const { data, error: qErr } = await supabase
        .from('live_sessions')
        .select('room_url, status')
        .eq('id', id)
        .single()

      if (qErr || !data) {
        setError('Canlı oturum bilgisi bulunamadı.')
        setSessionLoading(false)
        return
      }

      if (!data.room_url) {
        setError('Bu canlı destek oturumu için oda henüz oluşturulmamış.')
        setSessionLoading(false)
        return
      }

      setRoomUrl(data.room_url as string)
      setSessionLoading(false)
    }

    load()
  }, [id, searchParams])

  useEffect(() => {
    hangupNavigatedRef.current = false
  }, [roomUrl])

  useEffect(() => {
    if (!roomUrl || providerDisplayName === null) return

    const roomName = parseJitsiRoomName(roomUrl)
    if (!roomName || !jitsiParentRef.current) {
      console.error('Jitsi oda adı çözülemedi:', roomUrl)
      return
    }

    let cancelled = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    setJitsiConnecting(true)
    setJitsiVideoVisible(false)

    ;(async () => {
      try {
        await loadJitsiScript()
        if (cancelled || !jitsiParentRef.current) return
        const API = window.JitsiMeetExternalAPI
        if (!API) throw new Error('JitsiMeetExternalAPI yok')

        jitsiParentRef.current.innerHTML = ''

        const { embedProps, displayNameForCommand } = getJitsiMeetEmbedBundle(
          providerDisplayName,
          'provider'
        )
        const api = new API(JITSI_DOMAIN, {
          roomName,
          parentNode: jitsiParentRef.current,
          ...embedProps,
        })

        jitsiApiRef.current = api

        const onJoined = () => {
          if (cancelled) return
          try {
            api.executeCommand?.('displayName', displayNameForCommand)
          } catch {
            /* ignore */
          }
          setJitsiConnecting(false)
          requestAnimationFrame(() => {
            if (!cancelled) setJitsiVideoVisible(true)
          })
        }

        api.addEventListeners({
          videoConferenceJoined: onJoined,
          passwordRequired: () => {
            if (!cancelled) {
              setJitsiConnecting(true)
              setJitsiVideoVisible(false)
            }
          },
          readyToClose: () => navigateAfterHangup(),
          videoConferenceLeft: () => navigateAfterHangup(),
        })

        fallbackTimer = setTimeout(() => {
          if (!cancelled) {
            setJitsiConnecting(false)
            setJitsiVideoVisible(true)
          }
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
  }, [roomUrl, providerDisplayName, navigateAfterHangup])

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <p className="mb-4 text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/provider/live-sessions')}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Canlı Destek Taleplerine Dön
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-slate-950 sm:bg-slate-900 sm:p-4 md:p-6">
      <div className="relative flex h-[100dvh] w-full max-w-[1200px] flex-1 overflow-hidden bg-black shadow-xl sm:h-[min(92dvh,calc(100dvh-2rem))] sm:rounded-2xl sm:ring-1 sm:ring-white/10">
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
              Görüşmeye bağlanıyorsunuz...
            </p>
            <div
              className="mt-10 h-9 w-9 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500"
              aria-hidden
            />
          </div>
        )}
        <div
          ref={jitsiParentRef}
          className={`absolute inset-0 h-full w-full transition-all duration-500 ease-out will-change-[opacity,transform] ${
            jitsiVideoVisible
              ? 'opacity-100 scale-100'
              : 'pointer-events-none opacity-0 scale-[0.98]'
          }`}
          aria-hidden={!jitsiVideoVisible}
        />
      </div>
    </div>
  )
}

export default function ProviderLiveSessionRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      }
    >
      <ProviderLiveSessionRoomInner />
    </Suspense>
  )
}
