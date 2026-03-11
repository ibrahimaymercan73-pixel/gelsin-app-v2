'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type ProviderRow = {
  id: string
  full_name: string | null
  phone: string | null
  vehicle_type: string | null
  plate: string | null
  cities: string[]
  status: string
  documents: Record<string, string> | null
}

export default function AdminCekiciPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ProviderRow[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('service_type', 'cekici')
        .order('created_at', { ascending: false })
      if (error) {
        console.error(error)
        setItems([])
      } else {
        setItems(
          (data || []).map((p: any) => ({
            id: String(p.id),
            full_name: p.full_name,
            phone: p.phone,
            vehicle_type: p.vehicle_type,
            plate: p.plate,
            cities: Array.isArray(p.cities) ? p.cities : [],
            status: p.status || 'pending',
            documents: p.documents || null,
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [])

  const statusBadge = (status: string) => {
    const v = status.toLowerCase()
    if (v === 'approved')
      return 'badge-green'
    if (v === 'rejected')
      return 'badge-red'
    return 'badge-orange'
  }

  const statusLabel = (status: string) => {
    const v = status.toLowerCase()
    if (v === 'approved') return 'Onaylı'
    if (v === 'rejected') return 'Reddedildi'
    return 'Beklemede'
  }

  const updateStatus = async (row: ProviderRow, status: 'approved' | 'rejected') => {
    setUpdatingId(row.id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('provider_profiles')
        .update({ status })
        .eq('id', row.id)
      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: row.id,
        type: 'provider_status',
        title: status === 'approved' ? 'Çekici başvurunuz onaylandı' : 'Çekici başvurunuz reddedildi',
        body:
          status === 'approved'
            ? 'Artık çekici taleplerini görebilir ve teklif verebilirsiniz.'
            : 'Başvurunuz reddedildi. Detaylar için destek ile iletişime geçin.',
      })

      setItems((prev) =>
        prev.map((p) => (p.id === row.id ? { ...p, status } : p))
      )
    } catch (e: any) {
      alert(e?.message || 'Güncelleme başarısız.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
            Admin Paneli
          </p>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 mt-0.5">
            Çekici Başvuruları
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 flex items-center justify-center">
            <span className="text-sm text-slate-500">Yükleniyor...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">
            Henüz çekici başvurusu yok.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[2fr,1.5fr,1.5fr,1.5fr,1fr] gap-4 px-4 py-3 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
              <span>Aday</span>
              <span>Araç</span>
              <span>Şehirler</span>
              <span>Belgeler</span>
              <span>Durum</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((p) => (
                <div
                  key={p.id}
                  className="px-4 py-4 flex flex-col md:grid md:grid-cols-[2fr,1.5fr,1.5fr,1.5fr,1fr] gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800">
                      {p.full_name || '—'}
                    </p>
                    <p className="text-slate-500">
                      {p.phone ? <a href={`tel:${p.phone}`}>{p.phone}</a> : 'Telefon yok'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-700">
                      {p.vehicle_type || 'Araç tipi yok'}
                    </p>
                    <p className="text-slate-500">{p.plate || 'Plaka yok'}</p>
                  </div>

                  <div className="space-y-1">
                    {p.cities.length === 0 ? (
                      <p className="text-slate-500">Şehir belirtilmemiş</p>
                    ) : (
                      <p className="text-slate-700 line-clamp-2">
                        {p.cities.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    {p.documents && (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(p.documents).map(([key, url]) => (
                          <a
                            key={key}
                            href={String(url)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-full bg-slate-100 text-[11px] text-slate-700 border border-slate-200"
                          >
                            {key}
                          </a>
                        ))}
                      </div>
                    )}
                    {!p.documents && (
                      <p className="text-slate-500">Belge yok</p>
                    )}
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2">
                    <span className={statusBadge(p.status)}>
                      {statusLabel(p.status)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => updateStatus(p, 'approved')}
                        disabled={updatingId === p.id}
                        className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold disabled:opacity-60"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(p, 'rejected')}
                        disabled={updatingId === p.id}
                        className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold disabled:opacity-60"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

