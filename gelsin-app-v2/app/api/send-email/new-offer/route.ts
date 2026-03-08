import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { newOfferEmailHtml } from '../../../../lib/email-templates'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.GELSIN_FROM_EMAIL ?? 'Gelsin <bildirim@gelsin.dev>'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const job_id = typeof body?.job_id === 'string' ? body.job_id : null
    const provider_id = typeof body?.provider_id === 'string' ? body.provider_id : null
    const price = body?.price != null ? Number(body.price) : null

    if (!job_id || !provider_id || price == null || !Number.isFinite(price)) {
      return NextResponse.json({ error: 'job_id, provider_id ve price gerekli' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)

    const [{ data: job }, { data: providerProfile }] = await Promise.all([
      supabase.from('jobs').select('id, title, customer_id').eq('id', job_id).single(),
      supabase.from('profiles').select('full_name').eq('id', provider_id).single(),
    ])

    if (!job?.customer_id) {
      return NextResponse.json({ error: 'İş veya müşteri bulunamadı' }, { status: 404 })
    }

    const authRes = await supabase.auth.admin.getUserById(job.customer_id)
    const toEmail = authRes.data?.user?.email
    if (!toEmail) {
      return NextResponse.json({ error: 'Müşteri e-postası bulunamadı' }, { status: 404 })
    }

    const providerName = (providerProfile?.full_name as string) ?? 'Bir uzman'
    const jobTitle = (job.title as string) ?? 'İş ilanın'
    const offerPrice = price.toFixed(2)

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY tanımlı değil' }, { status: 500 })
    }

    const html = newOfferEmailHtml(providerName, offerPrice, jobTitle)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: 'İşine Yeni Bir Teklif Geldi! 💰',
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Resend new-offer error', data)
      return NextResponse.json({ error: data?.message ?? 'Mail gönderilemedi' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e) {
    console.error('send-email/new-offer', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
