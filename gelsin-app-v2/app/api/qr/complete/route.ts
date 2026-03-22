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
    const action = typeof body?.action === 'string' ? body.action : null

    if (!jobId || (action !== 'start' && action !== 'end')) {
      return NextResponse.json({ error: 'job_id ve action (start|end) zorunludur' }, { status: 400 })
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
      .select('id, status, customer_id, provider_id, title, payment_released, qr_scanned_at, qr_used_at, is_pro')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'İş bulunamadı.' }, { status: 404 })
    }

    if (job.provider_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    if (action === 'start') {
      if (job.qr_scanned_at) {
        return NextResponse.json({ error: 'Bu başlangıç QR zaten kullanılmış.' }, { status: 409 })
      }
      await supabase
        .from('jobs')
        .update({ status: 'started', qr_scanned_at: new Date().toISOString() })
        .eq('id', jobId)

      // İlk milestone'u aktif yap
      const { data: firstMilestone } = await supabase
        .from('milestones')
        .select('id')
        .eq('job_id', jobId)
        .eq('status', 'pending')
        .order('order_index', { ascending: true })
        .limit(1)
        .single()

      if (firstMilestone) {
        await supabase
          .from('milestones')
          .update({ status: 'active' })
          .eq('id', firstMilestone.id)
      }

      await supabase.from('notifications').insert({
        user_id: job.customer_id,
        title: '🔨 Uzman İşe Başladı!',
        body: `"${job.title}" işi başladı.`,
        type: 'job_started',
        related_job_id: jobId,
      })

      return NextResponse.json({ ok: true })
    }

    // end
    if (job.payment_released || job.qr_used_at || job.status === 'completed') {
      return NextResponse.json({ error: 'Bu bitiş QR zaten kullanılmış.' }, { status: 409 })
    }

    // Gelsin Pro: tüm milestone ödemeleri tamamlanmadan iş bitirilemez
    if ((job as { is_pro?: boolean }).is_pro) {
      const { data: msRows } = await supabase.from('milestones').select('id, status').eq('job_id', jobId)
      const list = msRows || []
      if (list.length > 0) {
        const allPaid = list.every((m) => m.status === 'customer_approved')
        if (!allPaid) {
          return NextResponse.json(
            {
              error:
                'Tüm aşamalar müşteri tarafından onaylanıp ödenmeden iş bitirilemez. Lütfen müşterinin her aşamayı onaylamasını bekleyin.',
            },
            { status: 400 }
          )
        }
      }
    }

    // 1) job status → completed
    await supabase
      .from('jobs')
      .update({ status: 'completed', qr_used_at: new Date().toISOString() })
      .eq('id', jobId)

    // Bitiş QR okundu, ödemeyi serbest bırak
    const payment = await supabase
      .from('payments')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'in_escrow')
      .single()

    if (payment.data) {
      const provider = await supabase
        .from('provider_profiles')
        .select('iban, completed_jobs, profiles(full_name)')
        .eq('id', payment.data.provider_id)
        .single()

      const trans_id = `gelsintr${String(payment.data.id).replace(/-/g, '')}${Date.now()}`
      const trans_info = [
        {
          amount: Math.round(Number(payment.data.provider_amount) * 100),
          receiver:
            ((provider.data as any)?.profiles?.full_name as string | undefined | null) ||
            'Gelsin Uzmanı',
          iban: (provider.data as any)?.iban as string,
        },
      ]

      const paytr_token = crypto
        .createHmac('sha256', process.env.PAYTR_MERCHANT_KEY!)
        .update(process.env.PAYTR_MERCHANT_ID! + trans_id + process.env.PAYTR_MERCHANT_SALT!)
        .digest('base64')

      await fetch('https://www.paytr.com/odeme/hesaptan-gonder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          merchant_id: process.env.PAYTR_MERCHANT_ID!,
          trans_id,
          trans_info: JSON.stringify(trans_info),
          paytr_token,
        }),
      })

      await supabase
        .from('payments')
        .update({ status: 'released', released_at: new Date().toISOString() })
        .eq('id', payment.data.id)

      await supabase
        .from('jobs')
        .update({ payment_released: true })
        .eq('id', jobId)

      const newCompleted = (Number((provider.data as any)?.completed_jobs) || 0) + 1
      await supabase
        .from('provider_profiles')
        .update({ completed_jobs: newCompleted })
        .eq('id', payment.data.provider_id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[qr/complete] exception', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

