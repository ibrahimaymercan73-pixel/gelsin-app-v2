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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik (SUPABASE_SERVICE_ROLE_KEY tanımlı mı?)' },
        { status: 500 }
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

    const supabase = createClient(url, serviceKey)

    const [customerAuth, { data: customerProfile }] = await Promise.all([
      supabase.auth.admin.getUserById(user.id),
      supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
    ])

    const customerEmail = customerAuth.data.user?.email
    if (!customerEmail) {
      return NextResponse.json({ error: 'Müşteri e-posta adresi bulunamadı.' }, { status: 400 })
    }

    const userName =
      (customerProfile?.full_name && customerProfile.full_name.trim().slice(0, 60)) || customerEmail
    const userPhone = (customerProfile?.phone && customerProfile.phone.trim()) || '05000000000'
    const userAddress = 'Türkiye'

    const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    const user_ip = ipHeader.split(',')[0]?.trim() || '127.0.0.1'

    const amount = 150
    const payment_amount = amount * 100
    const currency = 'TL'
    const test_mode = process.env.NODE_ENV === 'development' ? '1' : '0'
    const no_installment = '0'
    const max_installment = '0'

    const merchant_oid = `gelsinlive${String(user.id).replace(/[^a-zA-Z0-9]/g, '')}${Date.now()}`

    const merchant_ok_url = 'https://gelsin.dev/customer/live-support/paytr-success'
    const merchant_fail_url = 'https://gelsin.dev/customer/live-support/paytr-fail'
    console.log('merchant_ok_url:', merchant_ok_url)
    console.log('merchant_fail_url:', merchant_fail_url)

    const title = 'Canlı Destek Danışmanlık Ücreti'
    const user_basket = Buffer.from(JSON.stringify([[title, amount, 1]])).toString('base64')

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
    params.set('merchant_ok_url', merchant_ok_url)
    params.set('merchant_fail_url', merchant_fail_url)

    const tokenRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const tokenJson: any = await tokenRes
      .json()
      .catch(async () => ({ status: 'failed', reason: await tokenRes.text() }))

    console.log('[create-live-support-token] PayTR response:', JSON.stringify(tokenJson))

    if (tokenJson.status !== 'success' || !tokenJson.token) {
      console.log('[create-live-support-token] HATA:', tokenJson.reason)
      return NextResponse.json(
        { error: tokenJson.reason || 'Ödeme servisi şu anda kullanılamıyor.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ token: tokenJson.token as string, merchant_oid })
  } catch (e) {
    console.error('[paytr/create-live-support-token] exception', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

