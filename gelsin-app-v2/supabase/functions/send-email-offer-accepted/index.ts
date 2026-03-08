// Ustaya teklif kabul edildi maili – offers UPDATE (status=accepted) tetiklenince
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function offerAcceptedEmailHtml(
  customerName: string, customerPhone: string | null, customerEmail: string | null,
  jobTitle: string, jobAddress: string, agreedPrice: string
) {
  const contact = [customerName, customerPhone && `Tel: ${customerPhone}`, customerEmail && `E-posta: ${customerEmail}`].filter(Boolean).join(' · ')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;background:#f1f5f9;font-family:system-ui,sans-serif;">
  <div style="max-width:32rem;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:1.25rem;border-radius:1rem 1rem 0 0;text-align:center;"><strong>GELSİN</strong>.app</div>
    <div style="background:#fff;padding:1.5rem;border:1px solid #f1f5f9;border-top:none;border-radius:0 0 1rem 1rem;">
      <h2 style="margin:0 0 .75rem;font-size:1.25rem;">Tebrikler, İş Senin! 🎉</h2>
      <p style="margin:0 0 1rem;">Verdiğin teklif kabul edildi.</p>
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:1rem;border-radius:0 .5rem .5rem 0;margin:1rem 0;">
        <p style="margin:0;"><strong>📋 İş:</strong> ${esc(jobTitle)}</p>
        <p style="margin:.5rem 0 0;"><strong>📍 Adres:</strong> ${esc(jobAddress)}</p>
        <p style="margin:.5rem 0 0;"><strong>💰 Tutar:</strong> ${esc(agreedPrice)} ₺</p>
      </div>
      <p style="margin:1rem 0 0;font-weight:600;">Müşteri iletişim:</p>
      <p style="margin:.5rem 0 0;color:#475569;">${esc(contact)}</p>
      <a href="https://gelsin.dev/provider/my-jobs" style="display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#2563eb;color:#fff;font-weight:700;border-radius:.75rem;text-decoration:none;">İşlerime Git →</a>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:.75rem;margin-top:1rem;">GELSİN platformu</p>
  </div></body></html>`
}
const FROM_EMAIL = Deno.env.get('GELSIN_FROM_EMAIL') ?? 'Gelsin <bildirim@gelsin.dev>'

interface WebhookPayload {
  type: 'UPDATE'
  table: string
  schema: string
  record: { id: string; job_id: string; provider_id: string; status: string; [k: string]: unknown }
  old_record: { status: string; [k: string]: unknown }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  try {
    const payload = (await req.json()) as WebhookPayload
    if (payload.type !== 'UPDATE' || payload.table !== 'offers') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid event' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (payload.record.status !== 'accepted' || payload.old_record?.status === 'accepted') {
      return new Response(JSON.stringify({ ok: true, skipped: 'Not an acceptance' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { job_id, provider_id } = payload.record
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, address, agreed_price, customer_id')
      .eq('id', job_id)
      .single()

    if (!job?.customer_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const [customerAuth, customerProfile] = await Promise.all([
      supabase.auth.admin.getUserById(job.customer_id),
      supabase.from('profiles').select('full_name, phone').eq('id', job.customer_id).single(),
    ])

    const providerId = payload.record.provider_id
    const { data: authUser } = await supabase.auth.admin.getUserById(providerId)
    const toEmail = authUser?.user?.email
    if (!toEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'Provider email not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const customerName = (customerProfile?.data?.full_name as string) ?? 'Müşteri'
    const customerPhone = (customerProfile?.data?.phone as string) ?? null
    const customerEmail = customerAuth?.user?.email ?? null
    const jobTitle = (job.title as string) ?? 'İş'
    const jobAddress = (job.address as string) ?? '—'
    const agreedPrice = typeof job.agreed_price === 'number'
      ? job.agreed_price.toFixed(2)
      : String(job.agreed_price ?? '—')

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set')
      return new Response(JSON.stringify({ ok: false, error: 'Mail not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const html = offerAcceptedEmailHtml(
      customerName,
      customerPhone,
      customerEmail,
      jobTitle,
      jobAddress,
      agreedPrice
    )
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: 'Tebrikler, İş Senin! 🎉',
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Resend error', data)
      return new Response(JSON.stringify({ ok: false, error: data?.message ?? 'Send failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, id: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
