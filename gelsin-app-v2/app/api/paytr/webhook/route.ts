import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.GELSIN_FROM_EMAIL ?? 'Gelsin <bildirim@gelsin.dev>'

function hexToUuid(hex32: string): string {
  const s = hex32.replace(/[^a-fA-F0-9]/g, '').slice(0, 32)
  if (s.length !== 32) return ''
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
}

export async function POST(request: NextRequest) {
  try {
    console.log('[paytr/webhook] incoming request')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const merchant_key = process.env.PAYTR_MERCHANT_KEY
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT

    if (!url || !serviceKey || !merchant_key || !merchant_salt) {
      console.error('[paytr/webhook] missing env')
      return new Response('OK', { status: 200 }) // PayTR tarafında hataya sebep olmamak için
    }

    // PayTR application/x-www-form-urlencoded gönderiyor
    const body = await request.text()
    console.log('[paytr/webhook] raw body:', body)
    const params = new URLSearchParams(body)

    const merchant_oid = params.get('merchant_oid') || ''
    const status = params.get('status') || ''
    const total_amount = params.get('total_amount') || ''
    const hashRaw = params.get('hash') || ''

    if (!merchant_oid || !status || !hashRaw) {
      console.error('[paytr/webhook] missing fields', {
        merchant_oid,
        status,
        hash: hashRaw,
      })
      return new Response('OK', { status: 200 })
    }

    const hashStr = merchant_oid + merchant_salt + status + total_amount
    const expectedHash = crypto
      .createHmac('sha256', merchant_key)
      .update(hashStr)
      .digest('base64')

    const receivedHash = decodeURIComponent(hashRaw)

    if (receivedHash !== expectedHash) {
      console.log('[webhook] invalid hash')
      return new Response('PAYTR notification failed', { status: 400 })
    }

    const supabase = createClient(url, serviceKey)

    // 1) Canlı destek ödemeleri – merchant_oid "gelsinlive..." ile başlıyorsa
    if (merchant_oid.startsWith('gelsinlive')) {
      console.log('[paytr/webhook] live support payment detected')

      // merchant_oid => "gelsinlive" + <customer uuid hex32> + <timestamp>
      const customerId = hexToUuid(
        merchant_oid.slice('gelsinlive'.length, 'gelsinlive'.length + 32)
      )

      if (!customerId) {
        console.log('[paytr/webhook] live support: could not derive customerId from merchant_oid')
        return new Response('OK', { status: 200 })
      }

      const { data: session } = await supabase
        .from('live_sessions')
        .select('id, category, customer_city, fee_paid, status, customer_id')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!session) {
        console.log('[paytr/webhook] live support: no live_session found for customer', customerId)
        return new Response('OK', { status: 200 })
      }

      await supabase
        .from('live_sessions')
        .update({ fee_paid: true, status: 'waiting_provider' })
        .eq('id', session.id)

      const { data: catRow } = await supabase
        .from('service_categories')
        .select('name')
        .eq('id', (session as any).category)
        .maybeSingle()
      const categoryName = (catRow as any)?.name || 'Kategori'

      const categoryId = (session as any).category as string | null | undefined
      if (!categoryId) return new Response('OK', { status: 200 })

      const r = await supabase
        .from('provider_profiles')
        .select('id, is_online, city, service_categories')
        .contains('service_categories', [categoryId])
      const ppRows = ((r as any).data as any[]) || []

      const providerIds = ppRows
        .filter((p: any) => p?.id)
        .filter((p: any) => (typeof p?.is_online === 'boolean' ? p.is_online === true : true))
        .map((p: any) => p.id as string)

      if (providerIds.length > 0) {
        const notifications = providerIds.map((id) => ({
          user_id: id,
          title: '🔴 Canlı Destek Talebi!',
          body: `${categoryName} kategorisinde müşteri video görüşmesi bekliyor. ₺150 danışmanlık ücreti garantili.`,
          type: 'live_session_request',
          is_read: false,
          related_job_id: null,
        }))
        await supabase.from('notifications').insert(notifications)
      }

      return new Response('OK', { status: 200 })
    }

    // 2) Diğer tüm ödemeler – normal iş akışı
    const { data: payment } = await supabase
      .from('payments')
      .select('id, job_id, offer_id, customer_id, provider_id, amount, provider_amount, status')
      .eq('paytr_merchant_oid', merchant_oid)
      .maybeSingle()

    if (!payment) {
      console.error('[paytr/webhook] payment not found for oid', merchant_oid)
      return new Response('OK', { status: 200 })
    }

    if (status === 'success') {
      console.log('[paytr/webhook] status success – updating DB', {
        paymentId: payment.id,
        jobId: payment.job_id,
        offerId: payment.offer_id,
      })
      // Ödeme başarılı -> escrow'a al
      const updates = []
      updates.push(
        supabase
          .from('payments')
          .update({ status: 'in_escrow' })
          .eq('id', payment.id)
      )
      updates.push(
        supabase
          .from('jobs')
          .update({
            status: 'accepted',
            provider_id: payment.provider_id,
            agreed_price: payment.amount,
            escrow_held: true,
          })
          .eq('id', payment.job_id)
      )
      updates.push(
        supabase
          .from('offers')
          .update({ status: 'accepted' })
          .eq('id', payment.offer_id)
      )
      updates.push(
        supabase
          .from('offers')
          .update({ status: 'rejected' })
          .eq('job_id', payment.job_id)
          .neq('id', payment.offer_id)
      )

      await Promise.all(updates)
      console.log('[paytr/webhook] payments/offers/jobs updated to in_escrow/accepted')

      // Bildirimler
      await supabase.from('notifications').insert([
        {
          user_id: payment.provider_id,
          title: '🎉 Ödeme Başarılı',
          body: 'Müşteri ödemeyi tamamladı. İş detaylarını kontrol edin.',
          type: 'payment_in_escrow',
          related_job_id: payment.job_id,
        },
        {
          user_id: payment.customer_id,
          title: '✅ Ödemeniz Alındı',
          body: 'Ödemeniz güvenli havuza alındı. İş tamamlandığında onaylayabilirsiniz.',
          type: 'payment_in_escrow',
          related_job_id: payment.job_id,
        },
      ])

      // Basit e-posta bilgilendirmesi (isteğe bağlı, hata yutsa da olur)
      if (RESEND_API_KEY) {
        try {
          const [customerUser, providerUser] = await Promise.all([
            supabase.auth.admin.getUserById(payment.customer_id),
            supabase.auth.admin.getUserById(payment.provider_id),
          ])
          const customerEmail = customerUser.data.user?.email
          const providerEmail = providerUser.data.user?.email

          const sendEmail = async (to: string | undefined | null, subject: string, html: string) => {
            if (!to) return
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [to],
                subject,
                html,
              }),
            }).catch((e) => console.error('[paytr/webhook] Resend error', e))
          }

          await Promise.all([
            sendEmail(
              customerEmail,
              'Ödemeniz Alındı – Gelsin.app',
              '<p>Ödemeniz güvenli havuza alındı. İş tamamlandıktan sonra onaylayarak ustaya aktarabilirsiniz.</p>'
            ),
            sendEmail(
              providerEmail,
              'Yeni Ödeme – Gelsin.app',
              '<p>Bir iş için ödeme alındı ve güvenli havuza alındı. İş detayları için panele göz atın.</p>'
            ),
          ])
        } catch (e) {
          console.error('[paytr/webhook] email error', e)
        }
      }
    } else if (status === 'failed') {
      console.log('[paytr/webhook] status failed – mark payment as failed', {
        paymentId: payment.id,
      })
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)
    }

    console.log('[paytr/webhook] done for oid', merchant_oid)
    return new Response('OK', { status: 200 })
  } catch (e) {
    console.error('[paytr/webhook] exception', e)
    return new Response('OK', { status: 200 })
  }
}

