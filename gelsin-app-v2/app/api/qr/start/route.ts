import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { job_id } = await req.json()
  const supabase = createClient()

  // Job'u started yap
  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'started',
      qr_scanned_at: new Date().toISOString(),
    })
    .eq('id', job_id)
    .eq('status', 'accepted')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // İlk milestone'u active yap
  const { data: firstMilestone } = await supabase
    .from('milestones')
    .select('id')
    .eq('job_id', job_id)
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

  // Müşteriye bildirim gönder
  const { data: job } = await supabase
    .from('jobs')
    .select('customer_id, title')
    .eq('id', job_id)
    .single()

  if (job) {
    await supabase.from('notifications').insert({
      user_id: job.customer_id,
      title: '🔨 İş Başladı!',
      body: `"${job.title}" işi başladı. Uzman çalışmaya başladı.`,
      type: 'job_started',
      is_read: false,
    })
  }

  return NextResponse.json({ success: true })
}
