'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ProviderLiveSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('live_sessions_provider')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_sessions',
          filter: `status=eq.waiting_provider`,
        },
        (payload) => {
          setSessions((prev) => [payload.new as any, ...prev])
        }
      )
      .subscribe()

    supabase
      .from('live_sessions')
      .select('*, profiles!customer_id(full_name)')
      .eq('status', 'waiting_provider')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSessions(data as any[])
      })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const handleAccept = async (session: any) => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const res = await fetch('/api/daily/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    })
    const { room_url } = await res.json()

    await supabase
      .from('live_sessions')
      .update({
        provider_id: user.id,
        status: 'provider_joined',
        room_url,
        started_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    setLoading(false)
    router.push(`/provider/live-sessions/${session.id}?room=${encodeURIComponent(room_url)}`)
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto px-6">
      <div className="pt-14 pb-6">
        <h1 className="text-2xl font-black text-gray-900">Canlı Destek Talepleri</h1>
        <p className="text-sm text-gray-400 mt-1">
          Her kabul ettiğin görüşme için 150₺ garantili.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📡</span>
          <p className="text-gray-400 text-sm">Şu an bekleyen talep yok.</p>
          <p className="text-gray-300 text-xs mt-1">Yeni talep gelince burada görünecek.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="border-2 border-orange-100 rounded-2xl p-5 bg-orange-50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-xs font-bold text-orange-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  Bekliyor
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(session.created_at).toLocaleTimeString('tr-TR')}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-lg font-black text-gray-900 capitalize">{session.category}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {session.profiles?.full_name || 'Müşteri'} video görüşmesi bekliyor
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="bg-green-100 rounded-xl px-4 py-2">
                  <p className="text-xs text-green-600">Garantili kazanç</p>
                  <p className="text-lg font-black text-green-700">₺150</p>
                </div>
                <button
                  onClick={() => handleAccept(session)}
                  disabled={loading}
                  className="bg-gray-900 text-white rounded-xl px-6 py-3 font-bold text-sm disabled:opacity-50"
                >
                  {loading ? 'Bağlanıyor...' : 'Kabul Et →'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

