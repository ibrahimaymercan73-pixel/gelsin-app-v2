'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type MilestoneRow = {
  id: string
  title: string
  description: string | null
  amount: number
  percentage: number | null
  status: string
  photos: string[] | null
  ai_approved: boolean | null
  customer_approved?: boolean | null
  sort_order: number | null
}

export default function ProviderJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = typeof params?.id === 'string' ? params.id : ''

  const [job, setJob] = useState<any>(null)
  const [milestones, setMilestones] = useState<MilestoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)

  const load = async () => {
    if (!jobId) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    const { data: j } = await supabase
      .from('jobs')
      .select('*, service_categories(name, icon)')
      .eq('id', jobId)
      .maybeSingle()

    if (!j || j.provider_id !== user.id) {
      setJob(null)
      setMilestones([])
      setLoading(false)
      return
    }

    setJob(j)

    if (j.is_pro) {
      const { data: ms } = await supabase
        .from('milestones')
        .select(
          'id, title, description, amount, percentage, status, photos, ai_approved, customer_approved, sort_order'
        )
        .eq('job_id', jobId)
        .order('sort_order', { ascending: true })
      setMilestones((ms || []) as MilestoneRow[])
    } else {
      setMilestones([])
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [jobId, router])

  const activeMilestone = useMemo(() => {
    const sorted = [...milestones].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i]
      const prevOk = i === 0 || sorted.slice(0, i).every((x) => x.status === 'customer_approved')
      if (!prevOk) continue
      if (m.status === 'pending' || m.status === 'ai_rejected') return m
    }
    return null
  }, [milestones])

  const handleFiles = async (milestoneId: string, files: FileList | null) => {
    if (!files || files.length < 3) {
      alert('Lütfen en az 3 fotoğraf seçin.')
      return
    }
    const max = Math.min(files.length, 4)
    setUploading(milestoneId)
    try {
      const supabase = createClient()
      const urls: string[] = []
      const { data: sess } = await supabase.auth.getSession()
      if (!sess?.session) {
        alert('Oturum gerekli')
        return
      }
      for (let i = 0; i < max; i++) {
        const f = files[i]
        const ext = f.name.split('.').pop() || 'jpg'
        const path = `milestones/${milestoneId}/${Date.now()}_${i}.${ext}`
        const { error: upErr } = await supabase.storage.from('documents').upload(path, f, {
          upsert: true,
          contentType: f.type || 'image/jpeg',
        })
        if (upErr) {
          console.error(upErr)
          alert('Yükleme hatası: ' + upErr.message)
          return
        }
        const { data: pub } = supabase.storage.from('documents').getPublicUrl(path)
        if (pub?.publicUrl) urls.push(pub.publicUrl)
      }

      const { error: updErr } = await supabase
        .from('milestones')
        .update({ photos: urls, status: 'awaiting_customer', ai_report: null })
        .eq('id', milestoneId)

      if (updErr) {
        alert('Kayıt hatası: ' + updErr.message)
        return
      }

      await load()
    } finally {
      setUploading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-dvh bg-slate-50 p-6">
        <p className="text-slate-700">İş bulunamadı veya bu iş size atanmamış.</p>
        <Link href="/provider/my-jobs" className="mt-4 inline-block text-violet-600 underline">
          İşlerime dön
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-50 p-4 pb-24">
      <div className="mx-auto max-w-lg">
        <Link href="/provider/my-jobs" className="text-sm text-slate-500">
          ← İşlerim
        </Link>
        <h1 className="mt-3 text-lg font-bold text-slate-900">{job.title}</h1>
        <p className="text-sm text-slate-500">{job.service_categories?.name}</p>

        {job.is_pro && milestones.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Gelsin Pro — Aşamalar</h2>
            {milestones.map((m, idx) => (
              <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400">#{idx + 1}</p>
                    <p className="font-semibold text-slate-900">{m.title}</p>
                    {m.description && <p className="text-xs text-slate-600 mt-1">{m.description}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-slate-900">₺{Number(m.amount).toLocaleString('tr-TR')}</p>
                    {m.percentage != null && <p className="text-xs text-slate-500">%{m.percentage}</p>}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Durum: <span className="font-medium">{m.status}</span>
                </p>
                {activeMilestone?.id === m.id && (m.status === 'pending' || m.status === 'ai_rejected') && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <label className="text-xs font-semibold text-slate-700">Fotoğraf yükle (3–4)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="mt-2 block w-full text-sm"
                      disabled={!!uploading}
                      onChange={(e) => void handleFiles(m.id, e.target.files)}
                    />
                    {uploading === m.id && (
                      <p className="mt-2 text-xs text-violet-600">Yükleniyor…</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
