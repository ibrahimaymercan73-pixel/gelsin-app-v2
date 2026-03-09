import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

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
    const offerId = typeof body?.offer_id === 'string' ? body.offer_id : null

    if (!jobId || !offerId) {
      return NextResponse.json({ error: 'job_id ve offer_id zorunludur' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik (SUPABASE_SERVICE_ROLE_KEY tanımlı mı?)' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, serviceKey)

    // Offer ve iş doğrulaması
    const { data: offer, error: offerErr } = await supabase
      .from('offers')
      .select('id, job_id, provider_id, price, status')
      .eq('id', offerId)
      .single()

    if (offerErr || !offer) {
      return NextResponse.json({ error: 'Teklif bulunamadı.' }, { status: 404 })
    }

    if (offer.job_id !== jobId) {
      return NextResponse.json({ error: 'Teklif bu işe ait değil.' }, { status: 400 })
    }

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, customer_id, title')
      .eq('id', jobId)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'İş bulunamadı.' }, { status: 404 })
    }

    if (job.customer_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    const amount = Number(offer.price)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Geçersiz teklif tutarı.' }, { status: 400 })
    }

    const platform_fee = round2(amount * 0.02)
    const provider_amount = round2(amount - platform_fee)

    // customer email + profil bilgileri
    const [customerAuth, { data: customerProfile }] = await Promise.all([
      supabase.auth.admin.getUserById(user.id),
      supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
    ])
    const customerEmail = customerAuth.data.user?.email
    if (!customerEmail) {
      return NextResponse.json({ error: 'Müşteri e-posta adresi bulunamadı.' }, { status: 400 })
    }
    const userName =
      (customerProfile?.full_name && customerProfile.full_name.trim().slice(0, 60)) ||
      customerEmail
    const userPhone =
      (customerProfile?.phone && customerProfile.phone.trim()) || '05000000000'
    const userAddress = 'Türkiye'

    const idempotencyKey = `${user.id}_${offerId}`

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status, paytr_merchant_oid')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existingPayment && ['paid', 'in_escrow', 'released'].includes(existingPayment.status as string)) {
      return NextResponse.json(
        { error: 'Bu teklif için ödeme zaten alınmış.', code: 'already_paid' },
        { status: 409 }
      )
    }

    const merchant_id = process.env.PAYTR_MERCHANT_ID
    const merchant_key = process.env.PAYTR_MERCHANT_KEY
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return NextResponse.json(
        { error: 'PAYTR yapılandırması eksik. PAYTR_MERCHANT_ID/KEY/SALT tanımlı mı?' },
        { status: 500 }
      )
    }

    const merchant_oid =
      existingPayment?.paytr_merchant_oid ?? `gelsin_${offerId}_${Date.now().toString(36)}`

    const payment_amount = Math.round(amount * 100)
    const currency = 'TL'
    const test_mode = process.env.NODE_ENV === 'development' ? '1' : '0'
    const no_installment = '0'
    const max_installment = '0'

    const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    const user_ip = ipHeader.split(',')[0]?.trim() || '127.0.0.1'

    const basketTitle = (job.title as string) || 'Gelsin Hizmeti'
    const user_basket = Buffer.from(JSON.stringify([[basketTitle, amount, 1]])).toString('base64')

    const hashStr =
      merchant_id +
      user_ip +
      merchant_oid +
      customerEmail +
      payment_amount.toString() +
      user_basket +
      no_installment +
      max_installment +
      currency +
      test_mode +
      merchant_salt

    const paytr_token = crypto
      .createHmac('sha256', merchant_key)
      .update(hashStr)
      .digest('base64')

    const params = new URLSearchParams()
    params.set('merchant_id', merchant_id)
    params.set('user_ip', user_ip)
    params.set('merchant_oid', merchant_oid)
    params.set('email', customerEmail)
    params.set('user_name', userName)
    params.set('user_address', userAddress)
    params.set('user_phone', userPhone)
    params.set('payment_amount', payment_amount.toString())
    params.set('currency', currency)
    params.set('user_basket', user_basket)
    params.set('no_installment', no_installment)
    params.set('max_installment', max_installment)
    params.set('test_mode', test_mode)
    params.set('paytr_token', paytr_token)
    params.set('merchant_ok_url', 'https://gelsin.dev/customer/payment/success')
    params.set('merchant_fail_url', 'https://gelsin.dev/customer/payment/fail')

    const tokenRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const tokenJson: any = await tokenRes.json().catch(async () => {
      const txt = await tokenRes.text()
      return { status: 'failed', reason: txt }
    })

    if (!tokenRes.ok || tokenJson.status !== 'success' || !tokenJson.token) {
      console.error('[paytr/create-token] ERROR', tokenJson)
      return NextResponse.json(
        { error: tokenJson.reason || 'Ödeme servisi şu anda kullanılamıyor.' },
        { status: 502 }
      )
    }

    // payments kaydı – idempotent
    if (!existingPayment) {
      await supabase.from('payments').insert({
        job_id: jobId,
        offer_id: offerId,
        customer_id: user.id,
        provider_id: offer.provider_id,
        amount,
        platform_fee,
        provider_amount,
        status: 'pending',
        paytr_merchant_oid: merchant_oid,
        paytr_token,
        idempotency_key: idempotencyKey,
      })
    } else {
      await supabase
        .from('payments')
        .update({
          amount,
          platform_fee,
          provider_amount,
          status: 'pending',
          paytr_token,
        })
        .eq('id', existingPayment.id)
    }

    return NextResponse.json({ token: tokenJson.token as string, merchant_oid })
  } catch (e) {
    console.error('[paytr/create-token] exception', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

