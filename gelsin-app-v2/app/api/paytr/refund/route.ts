import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const paymentId = typeof body?.payment_id === 'string' ? body.payment_id : null
    const jobId = typeof body?.job_id === 'string' ? body.job_id : null
    const supportTicketId =
      typeof body?.support_ticket_id === 'string' ? body.support_ticket_id : null

    if (!paymentId && !jobId) {
      return NextResponse.json({ error: 'payment_id veya job_id zorunludur' }, { status: 400 })
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

    const supabaseAdmin = createClient(url, serviceKey)

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik (anon key)' },
        { status: 500 }
      )
    }

    const supabaseAuth = createClient(url, anonKey)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser(token)

    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    // Sadece admin rolü iade yapabilir
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    let query = supabaseAdmin
      .from('payments')
      .select('id, job_id, customer_id, provider_id, amount, status, paytr_merchant_oid')

    if (paymentId) {
      query = query.eq('id', paymentId)
    } else if (jobId) {
      query = query.eq('job_id', jobId)
    }

    const { data: payment } = await query
      .in('status', ['in_escrow', 'disputed'])
      .maybeSingle()

    if (!payment) {
      return NextResponse.json(
        { error: 'İadeye uygun (in_escrow veya disputed) bir ödeme bulunamadı.' },
        { status: 404 }
      )
    }

    const return_amount = Math.round(Number(payment.amount) * 100)
    const hashStr =
      merchant_id + payment.paytr_merchant_oid + return_amount.toString() + merchant_salt

    const paytr_token = crypto
      .createHmac('sha256', merchant_key)
      .update(hashStr)
      .digest('base64')

    const params = new URLSearchParams()
    params.set('merchant_id', merchant_id)
    params.set('merchant_oid', payment.paytr_merchant_oid)
    params.set('return_amount', return_amount.toString())
    params.set('paytr_token', paytr_token)

    const res = await fetch('https://www.paytr.com/odeme/iade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data: any = await res.json().catch(async () => {
      const txt = await res.text()
      return { status: 'failed', reason: txt }
    })

    if (!res.ok || data.status !== 'success') {
      console.error('[paytr/refund] refund error', data)
      return NextResponse.json(
        { error: data.reason || 'İade işlemi sırasında bir sorun oluştu.' },
        { status: 502 }
      )
    }

    // DB güncellemeleri
    await supabaseAdmin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id)

    await supabaseAdmin
      .from('jobs')
      .update({ status: 'cancelled', escrow_held: false, payment_released: false })
      .eq('id', payment.job_id)

    if (supportTicketId) {
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'resolved_refund', updated_at: new Date().toISOString() })
        .eq('id', supportTicketId)
    }

    const { data: admins } = await supabaseAdmin.from('profiles').select('id').eq('role', 'admin')
    const adminIds = (admins || []).map((a: any) => a.id as string)

    // Bildirimler
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: payment.customer_id,
        title: '💸 İadeniz Onaylandı',
        body: 'İadeniz onaylandı, 3-5 iş günü içinde hesabınıza geçecek.',
        type: 'payment_refund_approved',
        related_job_id: payment.job_id,
      },
      {
        user_id: payment.provider_id,
        title: '⚖️ Anlaşmazlık Sonucu',
        body: 'Anlaşmazlık müşteri lehine sonuçlandı.',
        type: 'dispute_resolved_refund',
        related_job_id: payment.job_id,
      },
      ...adminIds.map((id) => ({
        user_id: id,
        title: '✅ İade İşlemi Tamamlandı',
        body: `Anlaşmazlık iade ile çözüldü. payment_id=${payment.id}`,
        type: 'admin_refund_completed',
        related_job_id: payment.job_id,
      })),
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[paytr/refund] exception', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

