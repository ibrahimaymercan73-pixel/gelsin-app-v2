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

    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'İş bulunamadı' }, { status: 404 })
    }

    if (job.customer_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('id, job_id, offer_id, provider_id, amount, provider_amount, status, paytr_merchant_oid')
      .eq('job_id', jobId)
      .eq('status', 'in_escrow')
      .maybeSingle()

    if (!payment) {
      return NextResponse.json(
        { error: 'Bu iş için escrow bekleyen bir ödeme bulunamadı.' },
        { status: 400 }
      )
    }

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('iban, account_holder_name, completed_jobs')
      .eq('id', payment.provider_id)
      .single()

    if (!providerProfile?.iban || !providerProfile?.account_holder_name) {
      return NextResponse.json(
        { error: 'Uzmanın banka bilgileri eksik. Lütfen destek ile iletişime geçin.' },
        { status: 400 }
      )
    }

    const total_amount = Math.round(Number(payment.amount) * 100)
    const submerchant_amount = Math.round(Number(payment.provider_amount) * 100)
    const trans_id = `gelsin_transfer_${payment.id}`

    const hashStr =
      merchant_id +
      payment.paytr_merchant_oid +
      trans_id +
      submerchant_amount.toString() +
      total_amount.toString() +
      merchant_salt

    const paytr_token = crypto
      .createHmac('sha256', merchant_key)
      .update(hashStr)
      .digest('base64')

    const params = new URLSearchParams()
    params.set('merchant_id', merchant_id)
    params.set('merchant_oid', payment.paytr_merchant_oid)
    params.set('trans_id', trans_id)
    params.set('submerchant_amount', submerchant_amount.toString())
    params.set('total_amount', total_amount.toString())
    params.set('transfer_name', providerProfile.account_holder_name)
    params.set('transfer_iban', providerProfile.iban)
    params.set('paytr_token', paytr_token)

    const res = await fetch('https://www.paytr.com/odeme/platform/transfer', {
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

    await supabase.from('notifications').insert({
      user_id: payment.provider_id,
      title: '💸 Ödemeniz Aktarıldı',
      body: 'Müşteri işi onayladı ve ödeme hesabınıza aktarılıyor.',
      type: 'payment_released',
      related_job_id: payment.job_id,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[paytr/release-payment] exception', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

