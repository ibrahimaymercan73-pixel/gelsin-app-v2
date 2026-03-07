import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PLACEHOLDER_ADDRESS = 'Adres sohbet ile paylaşılacak'
const PLACEHOLDER_LAT = 41.0082
const PLACEHOLDER_LNG = 28.9784

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
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const serviceId = typeof body?.serviceId === 'string' ? body.serviceId.trim() : null
    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId gerekli' }, { status: 400 })
    }

    const supabase = createClient(url, serviceKey)

    const { data: service, error: serviceErr } = await supabase
      .from('provider_services')
      .select('id, provider_id, title, description, price, category_slug')
      .eq('id', serviceId)
      .eq('status', 'active')
      .maybeSingle()

    if (serviceErr) {
      console.error('[book-service] service fetch:', serviceErr)
      return NextResponse.json(
        { error: 'İlan sorgulanamadı. Veritabanında provider_services tablosu ve migration çalıştırıldı mı?' },
        { status: 500 }
      )
    }
    if (!service) {
      return NextResponse.json({ error: 'İlan bulunamadı veya ilan pasif. Lütfen yayındaki bir ilan seçin.' }, { status: 404 })
    }

    const { data: catRow } = await supabase
      .from('service_categories')
      .select('id')
      .eq('slug', service.category_slug || 'repair')
      .limit(1)
      .single()

    const categoryId = catRow?.id
    const { data: fallbackCat } = await supabase
      .from('service_categories')
      .select('id')
      .limit(1)
      .single()
    const category_id = categoryId || fallbackCat?.id
    if (!category_id) {
      return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 500 })
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let qrToken = ''
    for (let i = 0; i < 12; i++) {
      qrToken += chars[Math.floor(Math.random() * chars.length)]
    }

    const { data: newJob, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        customer_id: user.id,
        provider_id: service.provider_id,
        category_id,
        title: `Vitrin: ${service.title}`,
        description: service.description || '',
        address: PLACEHOLDER_ADDRESS,
        lat: PLACEHOLDER_LAT,
        lng: PLACEHOLDER_LNG,
        status: 'accepted',
        agreed_price: service.price,
        escrow_held: true,
        qr_token: qrToken,
      })
      .select('id')
      .single()

    if (jobErr || !newJob) {
      console.error('Job insert:', jobErr)
      return NextResponse.json({ error: 'İş oluşturulamadı: ' + (jobErr?.message || '') }, { status: 500 })
    }

    const { error: offerErr } = await supabase.from('offers').insert({
      job_id: newJob.id,
      provider_id: service.provider_id,
      price: service.price,
      status: 'accepted',
    })

    if (offerErr) {
      await supabase.from('jobs').delete().eq('id', newJob.id)
      console.error('Offer insert:', offerErr)
      return NextResponse.json({ error: 'Teklif kaydı oluşturulamadı' }, { status: 500 })
    }

    await supabase.from('notifications').insert({
      user_id: service.provider_id,
      title: '🛒 Yeni Vitrin Siparişi',
      body: `"${service.title}" hizmeti satın alındı. Müşteriyle mesajlaşabilirsiniz.`,
      type: 'offer_accepted',
      related_job_id: newJob.id,
    })

    return NextResponse.json({ jobId: newJob.id })
  } catch (e) {
    console.error('book-service:', e)
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 })
  }
}
