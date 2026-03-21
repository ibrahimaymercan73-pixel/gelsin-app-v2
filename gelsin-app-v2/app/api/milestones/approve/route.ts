import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const milestone_id = typeof body?.milestone_id === 'string' ? body.milestone_id : null
    if (!milestone_id) {
      return NextResponse.json({ error: 'milestone_id gerekli' }, { status: 400 })
    }

    const auth = await createServerSupabaseClient()
    const {
      data: { user },
    } = await auth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)

    const { data: milestone, error: mErr } = await supabase
      .from('milestones')
      .select('*')
      .eq('id', milestone_id)
      .single()

    if (mErr || !milestone) {
      return NextResponse.json({ error: 'Milestone bulunamadı' }, { status: 404 })
    }

    if (!milestone.ai_approved) {
      return NextResponse.json({ error: 'AI onayı bekleniyor' }, { status: 400 })
    }

    const { data: job, error: jErr } = await supabase
      .from('jobs')
      .select('id, customer_id, provider_id')
      .eq('id', milestone.job_id)
      .single()

    if (jErr || !job || job.customer_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const providerId = job.provider_id as string
    const amount = Number(milestone.amount)
    const commission = amount * 0.05
    const providerAmount = amount - commission

    const { error: rpcErr } = await supabase.rpc('add_to_wallet', {
      provider_id: providerId,
      amount: providerAmount,
    })

    if (rpcErr) {
      const { data: pp } = await supabase.from('provider_profiles').select('wallet_balance').eq('id', providerId).single()
      const nextBal = (Number(pp?.wallet_balance) || 0) + providerAmount
      const { error: upErr } = await supabase.from('provider_profiles').update({ wallet_balance: nextBal }).eq('id', providerId)
      if (upErr) {
        console.error('[approve] wallet update', upErr)
        return NextResponse.json({ error: 'Cüzdan güncellenemedi' }, { status: 500 })
      }
    }

    await supabase
      .from('milestones')
      .update({
        customer_approved: true,
        status: 'customer_approved',
        paid_at: new Date().toISOString(),
      })
      .eq('id', milestone_id)

    await supabase.from('notifications').insert({
      user_id: providerId,
      title: '💰 Ödeme Alındı!',
      body: `"${milestone.title}" aşaması için ₺${providerAmount.toFixed(2)} cüzdanınıza yansıdı.`,
      type: 'milestone_paid',
      is_read: false,
      related_job_id: milestone.job_id,
    })

    return NextResponse.json({ success: true, amount: providerAmount })
  } catch (e) {
    console.error('[milestones/approve]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
