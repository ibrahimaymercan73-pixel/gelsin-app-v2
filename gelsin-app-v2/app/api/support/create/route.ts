import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

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
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

    console.log('[support/create] called, body:', { jobId, reason })

    if (!jobId || !reason) {
      return NextResponse.json({ error: 'job_id ve reason zorunludur' }, { status: 400 })
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

    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id, provider_id, title')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'İş bulunamadı.' }, { status: 404 })
    }

    if (job.customer_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle()

    await supabase.from('support_tickets').insert({
      customer_id: user.id,
      provider_id: job.provider_id ?? null,
      category: 'service',
      title: 'Uyuşmazlık Talebi',
      message: reason,
      related_job_id: job.id,
      // payment_id kolonu yoksa bu alan yok sayılacak
      payment_id: payment?.id ?? null,
      status: 'pending',
    } as any)

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((a) => ({
          user_id: a.id,
          title: '⚠️ Yeni Uyuşmazlık Talebi',
          body: `"${job.title}" işi için müşteri uyuşmazlık talebi oluşturdu.`,
          type: 'job_disputed_admin',
          related_job_id: job.id,
        }))
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[support/create] exception', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

