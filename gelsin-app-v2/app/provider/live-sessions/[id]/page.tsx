'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ProviderLiveSessionRoomPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const id = params?.id as string

  useEffect(() => {
    const existingRoom = searchParams.get('room')
    const load = async () => {
      console.log('Session ID:', id)

      if (!id || id === 'undefined') {
        console.error('ID yok!')
        setError('Oturum bulunamadı.')
        setLoading(false)
        return
      }

      if (existingRoom) {
        setRoomUrl(existingRoom)
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('live_sessions')
        .select('room_url, status')
        .eq('id', id)
        .single()

      console.log('Session data:', data, 'Error:', error)

      if (error || !data) {
        setError('Canlı oturum bilgisi bulunamadı.')
        setLoading(false)
        return
      }

      if (!data.room_url) {
        setError('Bu canlı destek oturumu için oda henüz oluşturulmamış.')
        setLoading(false)
        return
      }

      setRoomUrl(data.room_url as string)
      setLoading(false)
    }

    load()
  }, [id, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/provider/live-sessions')}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold"
        >
          Canlı Destek Taleplerine Dön
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => router.push('/provider/live-sessions')}
          className="text-sm text-blue-600 font-semibold"
        >
          ← Taleplere Dön
        </button>
        <p className="text-xs text-gray-400">Canlı destek görüşmesi</p>
      </div>
      <div
        className="rounded-2xl overflow-hidden border border-gray-200"
        style={{ height: '500px', width: '100%' }}
      >
        <iframe
          src={roomUrl as string}
          allow="camera *; microphone *; fullscreen *; speaker *; display-capture *"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  )
}

