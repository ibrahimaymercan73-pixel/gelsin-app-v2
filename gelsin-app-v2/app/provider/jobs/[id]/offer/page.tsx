'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const PRO_THRESHOLD = 50000

const formatPrice = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const parsePriceToNumber = (formatted: string) => {
  const n = formatted.replace(/\D/g, '')
  return n ? parseInt(n, 10) : 0
}

const calculatePercentage = (amount: number, total: number) => {
  if (!total || !amount) return 0
  return Math.round((amount / total) * 100)
}

type MilestoneDraft = {
  title: string
  description: string
  amount: string
  percentage: string
}

const emptyMilestone = (): MilestoneDraft => ({
  title: '',
  description: '',
  amount: '',
  percentage: '',
})

export default function ProviderJobOfferPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = typeof params?.id === 'string' ? params.id : ''

  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([emptyMilestone(), emptyMilestone()])
  const [existingOfferId, setExistingOfferId] = useState<string | null>(null)

  const numericPrice = useMemo(() => parsePriceToNumber(price), [price])
  const isMilestone = numericPrice > 0 && numericPrice >= PRO_THRESHOLD

  const milestoneSum = useMemo(() => {
    let amt = 0
    let pct = 0
    for (const m of milestones) {
      const a = parsePriceToNumber(m.amount)
      amt += a
      pct += calculatePercentage(a, numericPrice)
    }
    return { amount: amt, percent: pct }
  }, [milestones, numericPrice])

  useEffect(() => {
    const run = async () => {
      if (!jobId) return
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: j, error: jErr } = await supabase
        .from('jobs')
        .select('*, service_categories(name, icon, slug)')
        .eq('id', jobId)
        .eq('status', 'open')
        .maybeSingle()

      if (jErr || !j) {
        setJob(null)
        setLoading(false)
        return
      }

      setJob(j)

      const { data: existing } = await supabase
        .from('offers')
        .select('id, price, estimated_duration, message, is_milestone, milestone_data')
        .eq('job_id', jobId)
        .eq('provider_id', user.id)
        .maybeSingle()

      if (existing) {
        setExistingOfferId(existing.id)
        setPrice(
          existing.price != null ? formatPrice(String(Math.round(Number(existing.price)))) : ''
        )
        setDuration(existing.estimated_duration || '')
        setMessage(existing.message || '')
        const md = existing.milestone_data as MilestoneDraft[] | null
        if (Array.isArray(md) && md.length >= 2) {
          setMilestones(
            md.map((row) => ({
              title: row.title || '',
              description: row.description || '',
              amount:
                row.amount != null ? formatPrice(String(Math.round(Number(row.amount)))) : '',
              percentage: '',
            }))
          )
        }
      }

      setLoading(false)
    }
    run()
  }, [jobId, router])

  const applySuggestedMilestones = () => {
    const p = parsePriceToNumber(price)
    if (p <= 0) return
    const a1 = Math.round(p * 0.2)
    const a2 = Math.round(p * 0.4)
    const a3 = p - a1 - a2
    setMilestones([
      {
        title: 'Ön Hazırlık',
        description: 'Malzeme ve hazırlık',
        amount: formatPrice(String(a1)),
        percentage: '',
      },
      {
        title: 'Ana İşler',
        description: 'Asıl işin yapılması',
        amount: formatPrice(String(a2)),
        percentage: '',
      },
      {
        title: 'Final',
        description: 'Son rötuş ve teslim',
        amount: formatPrice(String(a3)),
        percentage: '',
      },
    ])
  }

  const addStage = () => setMilestones((prev) => [...prev, emptyMilestone()])

  const updateStage = (index: number, patch: Partial<MilestoneDraft>) => {
    setMilestones((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const removeStage = (index: number) => {
    setMilestones((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)))
  }

  const validateMilestones = (): string | null => {
    if (milestones.length < 2) return 'En az 2 aşama gerekli.'
    for (const m of milestones) {
      if (!m.title.trim()) return 'Her aşamanın başlığı olmalı.'
      const a = parsePriceToNumber(m.amount)
      if (a <= 0) return 'Aşama tutarları geçerli olmalı.'
    }
    const totalAmt = milestones.reduce((s, m) => s + parsePriceToNumber(m.amount), 0)
    const totalPct = milestones.reduce(
      (s, m) => s + calculatePercentage(parsePriceToNumber(m.amount), numericPrice),
      0
    )
    if (Math.abs(totalAmt - numericPrice) > 0.01) return 'Aşama tutarlarının toplamı, teklif tutarına eşit olmalı.'
    if (Math.abs(totalPct - 100) > 2) return 'Aşama tutarlarını gözden geçirin (yuvarlama nedeniyle yüzde toplamı kayabilir).'
    return null
  }

  const submit = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      alert('Teklif verebilmek için tekrar giriş yapın.')
      return
    }

    const newPrice = parsePriceToNumber(price)
    if (newPrice <= 0) {
      alert('Lütfen geçerli bir fiyat girin.')
      return
    }

    const milestoneFlag = newPrice >= PRO_THRESHOLD
    let milestonePayload: Record<string, unknown>[] = []
    if (milestoneFlag) {
      const err = validateMilestones()
      if (err) {
        alert(err)
        return
      }
      milestonePayload = milestones.map((m, i) => ({
        title: m.title.trim(),
        description: m.description.trim(),
        amount: parsePriceToNumber(m.amount),
        percentage: calculatePercentage(parsePriceToNumber(m.amount), newPrice),
        sort_order: i,
      }))
    }

    setSubmitting(true)

    try {
      if (existingOfferId) {
        const current = await supabase.from('offers').select('price').eq('id', existingOfferId).single()
        const currentPrice = Number(current.data?.price || 0)
        if (newPrice >= currentPrice) {
          alert('Pazarlık için yeni fiyat mevcut fiyattan daha düşük olmalı.')
          setSubmitting(false)
          return
        }

        const { error: updateError } = await supabase
          .from('offers')
          .update({
            price: newPrice,
            estimated_duration: duration,
            message,
            is_bargain_requested: false,
            is_milestone: milestoneFlag,
            milestone_data: milestoneFlag ? milestonePayload : null,
          })
          .eq('id', existingOfferId)

        if (updateError) {
          alert('Teklif güncellenirken hata: ' + updateError.message)
          setSubmitting(false)
          return
        }

        await supabase.from('milestones').delete().eq('offer_id', existingOfferId)
        if (milestoneFlag && milestonePayload.length) {
          const rows = milestonePayload.map((row) => ({
            job_id: jobId,
            offer_id: existingOfferId,
            title: row.title,
            description: row.description,
            amount: row.amount,
            percentage: row.percentage,
            sort_order: row.sort_order,
            status: 'pending',
          }))
          const { error: mErr } = await supabase.from('milestones').insert(rows)
          if (mErr) console.error('[milestones]', mErr)
        }
      } else {
        const { data: ins, error } = await supabase
          .from('offers')
          .insert({
            job_id: jobId,
            provider_id: user.id,
            price: newPrice,
            estimated_duration: duration,
            message,
            is_milestone: milestoneFlag,
            milestone_data: milestoneFlag ? milestonePayload : null,
          })
          .select('id')
          .maybeSingle()

        if (error) {
          if ((error as { code?: string }).code === '23505') {
            alert('Bu işe zaten teklif verdiniz.')
          } else {
            alert('Teklif kaydedilirken hata: ' + error.message)
          }
          setSubmitting(false)
          return
        }

        const offerId = ins?.id as string
        if (milestoneFlag && milestonePayload.length && offerId) {
          const rows = milestonePayload.map((row) => ({
            job_id: jobId,
            offer_id: offerId,
            title: row.title,
            description: row.description,
            amount: row.amount,
            percentage: row.percentage,
            sort_order: row.sort_order,
            status: 'pending',
          }))
          const { error: mErr } = await supabase.from('milestones').insert(rows)
          if (mErr) console.error('[milestones]', mErr)
        }

        await supabase.from('notifications').insert({
          user_id: job?.customer_id,
          title: '💬 Yeni Teklif!',
          body: `"${job?.title}" işine yeni teklif geldi.`,
          type: 'new_offer',
          related_job_id: jobId,
        })
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        fetch(`${origin}/api/send-email/new-offer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId, provider_id: user.id, price: newPrice }),
        }).catch(() => {})
      }

      router.push('/provider/jobs')
    } finally {
      setSubmitting(false)
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
        <p className="text-slate-700">İş bulunamadı veya artık açık değil.</p>
        <Link href="/provider/jobs" className="mt-4 inline-block text-violet-600 underline">
          İşlere dön
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white p-4 pb-24">
      <div className="mx-auto max-w-lg">
        <Link href="/provider/jobs" className="text-sm text-slate-500 hover:text-slate-800">
          ← İşlere dön
        </Link>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Teklif ver</h1>
        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{job.title}</p>

        <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="text-xs font-bold text-slate-700">Fiyat (₺) *</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={price}
              onChange={(e) => setPrice(formatPrice(e.target.value))}
            />
          </div>

          {isMilestone && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Bu iş Gelsin Pro kapsamına giriyor. Teklifi aşamalara bölmen gerekiyor.
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700">Süre</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              placeholder="2 gün"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Not</label>
            <textarea
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {isMilestone && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">Aşamalar (min. 2)</p>
                <button
                  type="button"
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                  onClick={applySuggestedMilestones}
                >
                  Örnek: Ön Hazırlık %20, Ana İşler %40, Final %40
                </button>
                <button type="button" className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-medium text-white" onClick={addStage}>
                  Aşama Ekle
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Tutar toplamı: {formatPrice(String(milestoneSum.amount))} ₺ (hedef: {formatPrice(String(numericPrice))}{' '}
                ₺) · Yüzde toplamı: {milestoneSum.percent} %
              </p>
              {milestones.map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Aşama {i + 1}</span>
                    {milestones.length > 2 && (
                      <button type="button" className="text-xs text-red-600" onClick={() => removeStage(i)}>
                        Kaldır
                      </button>
                    )}
                  </div>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="Başlık"
                    value={m.title}
                    onChange={(e) => updateStage(i, { title: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="Açıklama"
                    value={m.description}
                    onChange={(e) => updateStage(i, { description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      type="text"
                      placeholder="Tutar (₺)"
                      inputMode="numeric"
                      autoComplete="off"
                      value={m.amount}
                      onChange={(e) => updateStage(i, { amount: formatPrice(e.target.value) })}
                    />
                    <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm font-bold text-gray-700">
                      %{calculatePercentage(parsePriceToNumber(m.amount), numericPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={submitting || parsePriceToNumber(price) <= 0}
            className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void submit()}
          >
            {submitting ? 'Gönderiliyor…' : 'Teklifi gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}
