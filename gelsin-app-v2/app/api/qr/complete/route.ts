import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const jobId = typeof body?.job_id === 'string' ? body.job_id : null
    const action = typeof body?.action === 'string' ? body.action : null

    if (!jobId || (action !== 'start' && action !== 'end')) {
      return NextResponse.json({ error: 'job_id ve action (start|end) zorunludur' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const merchant_id = process.env.PAYTR_MERCHANT_ID
    const merchant_key = process.env.PAYTR_MERCHANT_KEY
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT

    if (!url || !serviceKey || !merchant_id || !merchant_key || !merchant_salt) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik (Supabase veya PayTR ayarları)' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, serviceKey)

    const { data: job } = await supabase
      .from('jobs')
      .select('id, status, customer_id, provider_id, title, payment_released, qr_scanned_at, qr_used_at')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'İş bulunamadı.' }, { status: 404 })
    }

    if (job.provider_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    if (action === 'start') {
      if (job.qr_scanned_at) {
        return NextResponse.json({ error: 'Bu başlangıç QR zaten kullanılmış.' }, { status: 409 })
      }
      await supabase
        .from('jobs')
        .update({ status: 'started', qr_scanned_at: new Date().toISOString() })
        .eq('id', jobId)

      await supabase.from('notifications').insert({
        user_id: job.customer_id,
        title: '🔨 Uzman İşe Başladı!',
        body: `"${job.title}" işi başladı.`,
        type: 'job_started',
        related_job_id: jobId,
      })

      return NextResponse.json({ ok: true })
    }

    // end
    if (job.payment_released || job.qr_used_at || job.status === 'completed') {
      return NextResponse.json({ error: 'Bu bitiş QR zaten kullanılmış.' }, { status: 409 })
    }

    // 1) job status → completed
    await supabase
      .from('jobs')
      .update({ status: 'completed', qr_used_at: new Date().toISOString() })
      .eq('id', jobId)

    // 2) /api/paytr/release-payment tetikle (server-side aynı iş): in_escrow payment bul, hesaptan-gonder ile transfer
    const { data: payment } = await supabase
      .from('payments')
      .select('id, job_id, provider_id, provider_amount, status')
      .eq('job_id', jobId)
      .eq('status', 'in_escrow')
      .maybeSingle()

    if (!payment) {
      return NextResponse.json({ error: 'Bu iş için escrow bekleyen ödeme bulunamadı.' }, { status: 400 })
    }

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('iban, completed_jobs')
      .eq('id', payment.provider_id)
      .single()

    if (!providerProfile?.iban) {
      return NextResponse.json({ error: 'Uzmanın IBAN bilgisi eksik.' }, { status: 400 })
    }

    const { data: providerBase } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payment.provider_id)
      .single()

    const receiver = (providerBase?.full_name && providerBase.full_name.trim()) || 'Gelsin Uzmanı'

    const amountKurush = Math.round(Number(payment.provider_amount) * 100)
    const trans_id = `gelsin_${jobId.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`
    const trans_info = JSON.stringify([
      { amount: amountKurush, receiver, iban: providerProfile.iban },
    ])

    const hashStr = merchant_id + trans_id + merchant_salt
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hashStr).digest('base64')

    const params = new URLSearchParams()
    params.set('merchant_id', merchant_id)
    params.set('trans_id', trans_id)
    params.set('trans_info', trans_info)
    params.set('paytr_token', paytr_token)

    const res = await fetch('https://www.paytr.com/odeme/hesaptan-gonder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data: any = await res.json().catch(async () => {
      const txt = await res.text()
      return { status: 'failed', reason: txt }
    })

    if (!res.ok || data.status !== 'success') {
      console.error('[qr/complete] hesaptan-gonder error', data)
      return NextResponse.json({ error: data.reason || 'Transfer başlatılamadı.' }, { status: 502 })
    }

    // başarılıysa payments status → released, jobs status → completed zaten, provider completed_jobs +1
    await supabase
      .from('payments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', payment.id)

    await supabase
      .from('jobs')
      .update({ payment_released: true })
      .eq('id', jobId)

    const newCompleted = (providerProfile.completed_jobs || 0) + 1
    await supabase
      .from('provider_profiles')
      .update({ completed_jobs: newCompleted })
      .eq('id', payment.provider_id)

    await supabase.from('notifications').insert({
      user_id: payment.provider_id,
      title: '💸 Ödeme Transferi Başlatıldı',
      body: `"${job.title}" işi için ödeme IBAN'a aktarım sürecine alındı.`,
      type: 'payment_released',
      related_job_id: jobId,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[qr/complete] exception', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

