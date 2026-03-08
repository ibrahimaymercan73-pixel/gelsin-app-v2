'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function CustomerServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [service, setService] = useState<{
    id: string
    title: string
    description: string | null
    price: number
    image_url: string | null
    provider_id: string
    provider_name: string
    provider_rating: number | null
    provider_face_verified?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: row } = await supabase
        .from('provider_services')
        .select('id, title, description, price, image_url, provider_id')
        .eq('id', id)
        .eq('status', 'active')
        .single()
      if (!row) {
        setService(null)
        setLoading(false)
        return
      }
      const { data: profile } = await supabase
        .from('profiles_public')
        .select('full_name, face_verified')
        .eq('id', row.provider_id)
        .single()
      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('rating')
        .eq('id', row.provider_id)
        .single()
      setService({
        id: row.id,
        title: row.title,
        description: row.description,
        price: row.price,
        image_url: row.image_url,
        provider_id: row.provider_id,
        provider_name: profile?.full_name || 'Uzman',
        provider_rating: pp?.rating != null ? Number(pp.rating) : null,
        provider_face_verified: !!(profile as { face_verified?: boolean } | null)?.face_verified,
      })
      setLoading(false)
    }
    load()
  }, [id])

  const handleHemenCagir = async () => {
    setBooking(true)
    try {
      const res = await fetch('/api/book-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: id }),
      })
      let data: { error?: string; detail?: string; jobId?: string } = {}
      try {
        data = await res.json()
      } catch {
        console.error('[book-service] Response not JSON:', res.status, await res.text())
        toast.error(`Sunucu hatası (${res.status}). Network sekmesinden book-service isteğinin Response’una bakın.`)
        setBooking(false)
        return
      }
      if (!res.ok) {
        const msg = data.detail ? `${data.error} (${data.detail})` : (data.error || 'İşlem başarısız')
        console.error('[book-service]', res.status, data)
        toast.error(msg)
        setBooking(false)
        return
      }
      toast.success('Hizmet başarıyla alındı! Uzmanınızla mesajlaşmaya başlayabilirsiniz.')
      router.push(`/customer/jobs/${data.jobId}`)
    } catch (e) {
      toast.error('Beklenmeyen hata')
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center p-6">
        <p className="text-slate-600 mb-4">İlan bulunamadı</p>
        <Link href="/customer" className="text-blue-600 font-semibold">
          Ana sayfaya dön
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-white pb-24">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link
          href="/customer"
          className="text-slate-600 hover:text-slate-900 p-1"
          aria-label="Geri"
        >
          ←
        </Link>
        <h1 className="font-bold text-slate-900 truncate flex-1">İlan detayı</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="aspect-[4/3] bg-slate-100">
            {service.image_url ? (
              <img
                src={service.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                🔧
              </div>
            )}
          </div>
          <div className="p-4">
            <h2 className="text-xl font-black text-slate-900">{service.title}</h2>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              {service.provider_name}
              {service.provider_face_verified && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px]" title="Onaylı Uzman">✓</span>
              )}
            </p>
            {service.provider_rating != null && (
              <p className="text-xs text-amber-600 mt-0.5">★ {service.provider_rating.toFixed(1)}</p>
            )}
            {service.description && (
              <p className="text-slate-600 text-sm mt-3 whitespace-pre-line">
                {service.description}
              </p>
            )}
            <p className="text-2xl font-black text-blue-600 mt-4">₺{Number(service.price).toFixed(2)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleHemenCagir}
          disabled={booking}
          className="mt-6 w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base disabled:opacity-70 transition-all"
        >
          {booking ? 'İşleniyor...' : 'Hemen Bu Fiyata Çağır'}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          Ödeme ve adres detayları uzmanla mesajlaşırken paylaşılır.
        </p>
      </div>
    </div>
  )
}
