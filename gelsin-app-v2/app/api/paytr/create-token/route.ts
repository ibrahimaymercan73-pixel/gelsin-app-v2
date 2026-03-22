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
    const { job_id, offer_id, milestone_id: rawMilestoneId } = body as {
      job_id?: string
      offer_id?: string
      milestone_id?: string
    }
    const milestoneId =
      typeof rawMilestoneId === 'string' && rawMilestoneId.length >= 32 ? rawMilestoneId : null

    console.log('create-token body:', body)

    const jobId = typeof job_id === 'string' ? job_id : null
    const offerId = typeof offer_id === 'string' ? offer_id : null

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

    let amount: number
    let milestoneBasketLabel: string | null = null
    if (milestoneId) {
      const { data: ms, error: msErr } = await supabase
        .from('milestones')
        .select('id, job_id, amount, status, ai_approved, title, photos')
        .eq('id', milestoneId)
        .single()
      if (msErr || !ms) {
        return NextResponse.json({ error: 'Aşama bulunamadı.' }, { status: 404 })
      }
      if (ms.job_id !== jobId) {
        return NextResponse.json({ error: 'Aşama bu işe ait değil.' }, { status: 400 })
      }
      const photoList = Array.isArray(ms.photos) ? (ms.photos as unknown[]) : []
      const hasPhotos = photoList.some((p) => typeof p === 'string' && p.length > 0)
      const canPay =
        ms.status === 'awaiting_customer' ||
        (ms.status === 'ai_approved' && ms.ai_approved === true) ||
        (ms.status === 'photos_uploaded' && hasPhotos)
      if (!canPay) {
        return NextResponse.json(
          {
            error:
              'Bu aşama için ödeme: uzman fotoğraf yükledikten sonra siz inceleyip onaylayabilirsiniz (durum: müşteri onayı bekleniyor).',
          },
          { status: 400 }
        )
      }
      if (!hasPhotos) {
        return NextResponse.json(
          { error: 'Bu aşama için önce uzmanın fotoğraf yüklemesi gerekir.' },
          { status: 400 }
        )
      }
      amount = Number(ms.amount)
      milestoneBasketLabel = (ms.title as string)?.trim() || 'Pro aşaması'
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Aşama tutarı geçersiz.' }, { status: 400 })
      }
    } else {
      amount = Number(offer.price)
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Geçersiz teklif tutarı.' }, { status: 400 })
      }
    }

    const paytr_fee = Math.round(amount * 0.0399 * 100) / 100
    const platform_fee = Math.round(amount * 0.02 * 100) / 100
    const provider_amount = Math.round((amount - paytr_fee - platform_fee) * 100) / 100

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

    /** Her Pro aşaması ayrı PayTR ödemesi: teklif bazlı tek anahtar ikinci aşamayı blokluyordu */
    const idempotencyKey = milestoneId ? `mspay_${milestoneId}` : `${user.id}_${offerId}`

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status, paytr_merchant_oid')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existingPayment && ['paid', 'in_escrow', 'released'].includes(existingPayment.status as string)) {
      return NextResponse.json(
        {
          error: milestoneId
            ? 'Bu aşama için ödeme zaten alınmış.'
            : 'Bu teklif için ödeme zaten alınmış.',
          code: 'already_paid',
        },
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

    const baseMerchantOid = milestoneId
      ? 'gelsinmilestone' + String(milestoneId).replace(/-/g, '')
      : 'gelsin' + String(jobId).replace(/-/g, '').slice(0, 16) + String(offerId).replace(/-/g, '').slice(0, 8)

    const merchant_oid = existingPayment?.paytr_merchant_oid ?? baseMerchantOid

    const payment_amount = Math.round(amount * 100)
    const currency = 'TL'
    const test_mode = process.env.NODE_ENV === 'development' ? '1' : '0'
    const no_installment = '0'
    const max_installment = '0'

    const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    const user_ip = ipHeader.split(',')[0]?.trim() || '127.0.0.1'

    const basketTitle = milestoneBasketLabel
      ? `${(job.title as string) || 'Gelsin'} — ${milestoneBasketLabel}`
      : (job.title as string) || 'Gelsin Hizmeti'
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

    const formBody = params.toString()
    const tokenRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    })

    const tokenJson: any = await tokenRes
      .json()
      .catch(async () => {
        const txt = await tokenRes.text()
        return { status: 'failed', reason: txt }
      })

    console.log('[create-token] PayTR response:', JSON.stringify(tokenJson))

    if (tokenJson.status !== 'success' || !tokenJson.token) {
      console.log('[create-token] HATA:', tokenJson.reason)
      return NextResponse.json(
        { error: tokenJson.reason || 'Ödeme servisi şu anda kullanılamıyor.' },
        { status: 400 }
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
        paytr_fee,
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
          paytr_fee,
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

