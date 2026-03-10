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
    const supportTicketId =
      typeof body?.support_ticket_id === 'string' ? body.support_ticket_id : null
    if (!jobId) {
      return NextResponse.json({ error: 'job_id zorunludur' }, { status: 400 })
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

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin = actorProfile?.role === 'admin'

    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'İş bulunamadı' }, { status: 404 })
    }

    if (!isAdmin && job.customer_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    const { data: payment } = await supabase
      .from('payments')
      .select(
        'id, job_id, offer_id, provider_id, amount, provider_amount, status, paytr_merchant_oid'
      )
      .eq('job_id', jobId)
      .in('status', ['in_escrow', 'disputed'])
      .maybeSingle()

    if (!payment) {
      return NextResponse.json(
        { error: 'Bu iş için escrow bekleyen bir ödeme bulunamadı.' },
        { status: 400 }
      )
    }

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('iban, completed_jobs')
      .eq('id', payment.provider_id)
      .single()

    if (!providerProfile?.iban) {
      return NextResponse.json(
        { error: 'Uzmanın banka bilgileri eksik. Lütfen destek ile iletişime geçin.' },
        { status: 400 }
      )
    }
    // Uzmanın adı – PayTR hesaptan-gonder için
    const { data: providerProfileBase } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payment.provider_id)
      .single()

    const providerName =
      (providerProfileBase?.full_name && providerProfileBase.full_name.trim()) || 'Gelsin Uzmanı'

    const amountKurush = Math.round(Number(payment.provider_amount) * 100)
    const trans_id = `gelsin_tx_${payment.id}_${Date.now()}`
    const trans_info = JSON.stringify([
      {
        amount: amountKurush,
        receiver: providerName,
        iban: providerProfile.iban,
      },
    ])

    const hashStr = merchant_id + trans_id + merchant_salt

    const paytr_token = crypto
      .createHmac('sha256', merchant_key)
      .update(hashStr)
      .digest('base64')

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
      console.error('[paytr/release-payment] transfer error', data)
      return NextResponse.json(
        { error: data.reason || 'Ödeme aktarılırken bir sorun oluştu.' },
        { status: 502 }
      )
    }

    // DB güncellemeleri
    await supabase
      .from('payments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', payment.id)

    await supabase
      .from('jobs')
      .update({ status: 'completed', payment_released: true })
      .eq('id', payment.job_id)

    // Tamamlanan iş sayısını arttır
    const newCompleted = (providerProfile.completed_jobs || 0) + 1
    await supabase
      .from('provider_profiles')
      .update({ completed_jobs: newCompleted })
      .eq('id', payment.provider_id)

    if (supportTicketId) {
      await supabase
        .from('support_tickets')
        .update({ status: 'resolved_provider', updated_at: new Date().toISOString() })
        .eq('id', supportTicketId)
    }

    await supabase.from('notifications').insert([
      {
        user_id: payment.provider_id,
        title: '⚖️ Anlaşmazlık Sonucu',
        body: 'Anlaşmazlık uzman lehine sonuçlandı, ödemeniz yolda.',
        type: 'dispute_resolved_provider',
        related_job_id: payment.job_id,
      },
      {
        user_id: job.customer_id,
        title: '⚖️ Anlaşmazlık Sonucu',
        body: 'Anlaşmazlık uzman lehine sonuçlandı.',
        type: 'dispute_resolved_provider',
        related_job_id: payment.job_id,
      },
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[paytr/release-payment] exception', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

