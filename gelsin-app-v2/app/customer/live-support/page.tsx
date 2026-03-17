'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const CATEGORIES = [
  { id: 'tesisat', label: 'Tesisat & Elektrik', icon: '🔧' },
  { id: 'boyabadana', label: 'Boya & Badana', icon: '🖌️' },
  { id: 'temizlik', label: 'Temizlik', icon: '🧹' },
  { id: 'aracyardim', label: 'Araç Yardım', icon: '🚗' },
  { id: 'elektrik', label: 'Elektrik', icon: '⚡' },
  { id: 'guzellik', label: 'Güzellik', icon: '✂️' },
]

export default function LiveSupportPage() {
  const router = useRouter()
  const [step, setStep] = useState<'category' | 'payment' | 'waiting' | 'video'>('category')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [roomUrl, setRoomUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id)
    setStep('payment')
  }

  const handlePayment = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        customer_id: user.id,
        category: selectedCategory,
        status: 'waiting_provider',
        consultation_fee: 150,
        fee_paid: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }

    setSessionId(data.id)

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
        message: `${selectedCategory} kategorisinde müşteri video görüşmesi bekliyor. 150₺ danışmanlık ücreti garantili.`,
        data: { session_id: data.id },
        read: false,
        created_at: new Date().toISOString(),
      }))
      await supabase.from('notifications').insert(notifications)
    }

    setStep('waiting')
    setLoading(false)

    const channel = supabase
      .channel(`live_session_${data.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${data.id}`,
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
            {CATEGORIES.map((cat) => (
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
                {selectedCategory || '-'}
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
          <h2 className="text-xl font-black text-gray-900 mb-4">Uzman Bağlandı! 🎉</h2>
          <div
            className="rounded-2xl overflow-hidden border border-gray-200 mb-4"
            style={{ height: '500px' }}
          >
            <iframe
              src={roomUrl}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
          <p className="text-xs text-gray-400 text-center">
            Görüşme bittikten sonra uzman sana teklif gönderecek.
          </p>
        </div>
      )}
    </div>
  )
}

