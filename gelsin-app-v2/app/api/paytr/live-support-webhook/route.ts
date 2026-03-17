import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function hexToUuid(hex32: string): string {
  const s = hex32.replace(/[^a-fA-F0-9]/g, '').slice(0, 32)
  if (s.length !== 32) return ''
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
}

export async function POST(request: NextRequest) {
  console.log('=== LIVE SUPPORT WEBHOOK TETİKLENDİ ===')
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const merchant_key = process.env.PAYTR_MERCHANT_KEY
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT

    if (!url || !serviceKey || !merchant_key || !merchant_salt) {
      return new Response('OK', { status: 200 })
    }

    const body = await request.text()
    console.log('Webhook body:', body)
    const params = new URLSearchParams(body)

    const merchant_oid = params.get('merchant_oid') || ''
    const status = params.get('status') || ''
    const total_amount = params.get('total_amount') || ''
    const hashRaw = params.get('hash') || ''

    if (!merchant_oid || !status || !hashRaw) {
      return new Response('OK', { status: 200 })
    }

    const hashStr = merchant_oid + merchant_salt + status + total_amount
    const expectedHash = crypto
      .createHmac('sha256', merchant_key)
      .update(hashStr)
      .digest('base64')

    const receivedHash = decodeURIComponent(hashRaw)
    if (receivedHash !== expectedHash) {
      return new Response('PAYTR notification failed', { status: 400 })
    }

    if (status !== 'success') {
      return new Response('OK', { status: 200 })
    }

    const supabase = createClient(url, serviceKey)

    // merchant_oid => "gelsinlive" + <customer uuid hex32> + <timestamp>
    let customerId = ''
    if (merchant_oid.startsWith('gelsinlive')) {
      customerId = hexToUuid(merchant_oid.slice('gelsinlive'.length, 'gelsinlive'.length + 32))
    }

    if (!customerId) {
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

    const customerCity = (session as any).customer_city as string | null | undefined
    const categoryId = (session as any).category as string | null | undefined
    if (!categoryId) return new Response('OK', { status: 200 })

    // Bu projede ustanın kategorileri genelde provider_profiles.service_categories (uuid[]) içinde tutuluyor.
    // is_online de provider_profiles'ta.
    let ppRows: any[] = []
    if (customerCity) {
      const r = await supabase
        .from('provider_profiles')
        .select('id, is_online, city, service_categories')
        .contains('service_categories', [categoryId])
        .eq('city', customerCity)
      if ((r as any).error) {
        const r2 = await supabase
          .from('provider_profiles')
          .select('id, is_online, city, service_categories')
          .contains('service_categories', [categoryId])
        ppRows = ((r2 as any).data as any[]) || []
      } else {
        ppRows = ((r as any).data as any[]) || []
      }
    } else {
      const r = await supabase
        .from('provider_profiles')
        .select('id, is_online, city, service_categories')
        .contains('service_categories', [categoryId])
      ppRows = ((r as any).data as any[]) || []
    }

    // is_online kolonu yoksa: hepsini kabul et (bildirim gitsin)
    const providerIds = ppRows
      .filter((p: any) => p?.id)
      .filter((p: any) => (typeof p?.is_online === 'boolean' ? p.is_online === true : true))
      .map((p: any) => p.id as string)

    const providers = providerIds.map((id) => ({ id }))

    if (providers && providers.length > 0) {
      const notifications = providers.map((p: { id: string }) => ({
        user_id: p.id,
        title: '🔴 Canlı Destek Talebi!',
        body: `${categoryName} kategorisinde müşteri video görüşmesi bekliyor. ₺150 danışmanlık ücreti garantili.`,
        type: 'live_session_request',
        is_read: false,
        related_job_id: null,
      }))
      await supabase.from('notifications').insert(notifications)
    }

    return new Response('OK', { status: 200 })
  } catch {
    return new Response('OK', { status: 200 })
  }
}

