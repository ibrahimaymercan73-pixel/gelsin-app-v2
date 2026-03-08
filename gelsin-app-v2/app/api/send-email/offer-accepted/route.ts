import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { offerAcceptedEmailHtml } from '../../../../lib/email-templates'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.GELSIN_FROM_EMAIL ?? 'Gelsin <bildirim@gelsin.dev>'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const job_id = typeof body?.job_id === 'string' ? body.job_id : null
    const provider_id = typeof body?.provider_id === 'string' ? body.provider_id : null

    if (!job_id || !provider_id) {
      return NextResponse.json({ error: 'job_id ve provider_id gerekli' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)

    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, address, agreed_price, customer_id')
      .eq('id', job_id)
      .single()

    if (!job?.customer_id) {
      return NextResponse.json({ error: 'İş bulunamadı' }, { status: 404 })
    }

    const [customerAuth, customerProfile] = await Promise.all([
      supabase.auth.admin.getUserById(job.customer_id),
      supabase.from('profiles').select('full_name, phone').eq('id', job.customer_id).single(),
    ])

    const { data: providerAuth } = await supabase.auth.admin.getUserById(provider_id)
    const toEmail = providerAuth?.user?.email
    if (!toEmail) {
      return NextResponse.json({ error: 'Usta e-postası bulunamadı' }, { status: 404 })
    }

    const customerName = (customerProfile?.data?.full_name as string) ?? 'Müşteri'
    const customerPhone = (customerProfile?.data?.phone as string) ?? null
    const customerEmail = customerAuth?.user?.email ?? null
    const jobTitle = (job.title as string) ?? 'İş'
    const jobAddress = (job.address as string) ?? '—'
    const agreedPrice =
      typeof job.agreed_price === 'number'
        ? job.agreed_price.toFixed(2)
        : String(job.agreed_price ?? '—')

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY tanımlı değil' }, { status: 500 })
    }

    const html = offerAcceptedEmailHtml(
      customerName,
      customerPhone,
      customerEmail,
      jobTitle,
      jobAddress,
      agreedPrice
    )
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: 'Tebrikler, İş Senin! 🎉',
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Resend offer-accepted error', data)
      return NextResponse.json({ error: data?.message ?? 'Mail gönderilemedi' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e) {
    console.error('send-email/offer-accepted', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
