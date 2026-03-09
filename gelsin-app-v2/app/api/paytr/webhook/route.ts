import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.GELSIN_FROM_EMAIL ?? 'Gelsin <bildirim@gelsin.dev>'

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
    const hashParam = params.get('hash') || ''

    if (!merchant_oid || !status || !hashParam) {
      console.error('[paytr/webhook] missing fields', { merchant_oid, status, hash })
      return new Response('OK', { status: 200 })
    }

    // Hash doğrulama – PayTR iFrame API standart webhook formatı:
    // hash_str = merchant_oid + SALT + status
    // HMAC key = merchant_key
    const hashStr = merchant_oid + merchant_salt + status
    const expectedHash = crypto
      .createHmac('sha256', merchant_key)
      .update(hashStr)
      .digest('base64')

    // Gelen hash URL decode edilmiş olabilir
    const receivedHash = decodeURIComponent(hashParam)

    console.log('[paytr/webhook] computed hash', {
      merchant_oid,
      status,
      expectedHash,
      receivedHash,
    })

    if (receivedHash !== expectedHash) {
      console.log('[webhook] hash mismatch', { expected: expectedHash, received: receivedHash })
      return new Response('PAYTR notification failed', { status: 400 })
    }

    const supabase = createClient(url, serviceKey)

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

