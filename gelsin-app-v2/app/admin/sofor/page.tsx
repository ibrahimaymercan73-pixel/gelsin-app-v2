'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentUserAndRole } from '@/lib/auth'
import { Loader2, RefreshCw } from 'lucide-react'

type Row = {
  id: string
  status: string
  bio: string | null
  id_document_url: string | null
  criminal_record_url: string | null
  profiles?: { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null
}

type SoforMeta = {
  type?: string
  fullName?: string
  phone?: string
  license?: { class?: string; year?: number | null; photo?: string }
  preferences?: { vehicleTypes?: string[]; transmission?: string; note?: string }
  iban?: string
  criminalRecord?: { doc?: string; cleanConfirmed?: boolean }
}

function normalizeProfile(p: Row['profiles']): { full_name: string | null; phone: string | null } | null {
  if (!p) return null
  return Array.isArray(p) ? (p[0] ?? null) : p
}

function parseMeta(bio: string | null): SoforMeta | null {
  if (!bio) return null
  try {
    const obj = JSON.parse(bio)
    return obj && typeof obj === 'object' ? (obj as SoforMeta) : null
  } catch {
    return null
  }
}

function statusBadge(s: string) {
  if (s === 'approved') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (s === 'rejected') return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
}

function statusLabel(s: string) {
  if (s === 'approved') return 'Onaylandı'
  if (s === 'rejected') return 'Reddedildi'
  return 'Bekliyor'
}

export default function AdminSoforPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const list = useMemo(() => {
    return rows
      .map((r) => ({ r, meta: parseMeta(r.bio) }))
      .filter(({ meta }) => (meta?.type || '').toLowerCase() === 'sofor_onboarding')
  }, [rows])

  const load = async () => {
    setLoading(true)
    const { user, role } = await getCurrentUserAndRole()
    if (!user) {
      setRows([])
      setLoading(false)
      return
    }
    if (role !== 'admin') {
      setRows([])
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('provider_profiles')
      .select('id, status, bio, id_document_url, criminal_record_url, profiles(full_name, phone)')
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setRows([])
    } else {
      setRows((data || []) as any)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const setStatus = async (providerId: string, next: 'approved' | 'rejected') => {
    setUpdating(providerId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('provider_profiles')
        .update({ status: next } as any)
        .eq('id', providerId)
      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: providerId,
        title: next === 'approved' ? '✅ Şoför başvurun onaylandı' : '❌ Şoför başvurun reddedildi',
        body: next === 'approved'
          ? 'Artık şoför ilanlarını görebilir ve teklif verebilirsin.'
          : 'Başvurun reddedildi. Lütfen bilgilerini kontrol edip tekrar dene.',
        type: next === 'approved' ? 'provider_approved_sofor' : 'provider_rejected_sofor',
      } as any)

      await load()
    } catch (e: any) {
      alert(e?.message || 'Güncellenemedi.')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">👨‍✈️ Şoför Başvuruları</h1>
            <p className="text-sm text-slate-500">Onay bekleyen / onaylanan / reddedilen başvurular</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </header>

        {loading ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-slate-500" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">
            Başvuru bulunamadı.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(({ r, meta }) => {
              const p = normalizeProfile(r.profiles)
              const fullName = meta?.fullName || p?.full_name || '—'
              const phone = meta?.phone || p?.phone || '—'
              const license = meta?.license?.class || '—'
              const vehiclePrefs = Array.isArray(meta?.preferences?.vehicleTypes) ? meta!.preferences!.vehicleTypes! : []
              const transmission = meta?.preferences?.transmission || '—'
              const docs = {
                ehliyet: meta?.license?.photo || r.id_document_url,
                sabika: meta?.criminalRecord?.doc || r.criminal_record_url,
              }
              return (
                <div key={r.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{fullName}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusBadge(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{phone}</p>
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">Ehliyet:</span> {license} · <span className="font-semibold">Vites:</span> {String(transmission).toUpperCase()}
                      </p>
                      {vehiclePrefs.length > 0 && (
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold">Araç tercihleri:</span> {vehiclePrefs.slice(0, 8).join(', ')}{vehiclePrefs.length > 8 ? '…' : ''}
                        </p>
                      )}
                      {meta?.preferences?.note && (
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold">Not:</span> {meta.preferences.note}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStatus(r.id, 'approved')}
                        disabled={!!updating}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(r.id, 'rejected')}
                        disabled={!!updating}
                        className="px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <DocThumb label="Ehliyet" url={docs.ehliyet} onOpen={setLightbox} />
                    <DocThumb label="Sabıka" url={docs.sabika} onOpen={setLightbox} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-3xl w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="" className="w-full h-auto rounded-2xl bg-black" />
          </div>
        </div>
      )}
    </div>
  )
}

function DocThumb({ label, url, onOpen }: { label: string; url: string | null | undefined; onOpen: (u: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => url && onOpen(url)}
      disabled={!url}
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left ${url ? 'hover:bg-slate-100' : 'opacity-60 cursor-not-allowed'}`}
    >
      <p className="text-xs font-semibold text-slate-700 mb-2">{label}</p>
      {url ? (
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-video rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 text-xs">
          Yüklenmedi
        </div>
      )}
    </button>
  )
}

