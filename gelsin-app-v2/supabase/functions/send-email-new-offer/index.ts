// Müşteriye yeni teklif maili – offers INSERT tetiklenince
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('GELSIN_FROM_EMAIL') ?? 'Gelsin <bildirim@gelsin.dev>'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function newOfferEmailHtml(providerName: string, offerPrice: string, jobTitle: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;background:#f1f5f9;font-family:system-ui,sans-serif;">
  <div style="max-width:32rem;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:1.25rem;border-radius:1rem 1rem 0 0;text-align:center;"><strong>GELSİN</strong>.app</div>
    <div style="background:#fff;padding:1.5rem;border:1px solid #f1f5f9;border-top:none;border-radius:0 0 1rem 1rem;">
      <h2 style="margin:0 0 .75rem;font-size:1.25rem;">İşine Yeni Bir Teklif Geldi! 💰</h2>
      <p style="margin:0 0 1rem;"><strong>${esc(jobTitle)}</strong> ilanına bir uzman teklif verdi.</p>
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:1rem;border-radius:0 .5rem .5rem 0;margin:1rem 0;">
        <p style="margin:0;"><strong>👤 Uzman:</strong> ${esc(providerName)}</p>
        <p style="margin:.5rem 0 0;font-size:1.25rem;color:#1e3a5f;"><strong>💰 Teklif:</strong> ${esc(offerPrice)} ₺</p>
      </div>
      <a href="https://gelsin.dev/customer/jobs" style="display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#2563eb;color:#fff;font-weight:700;border-radius:.75rem;text-decoration:none;">Tekliflere Git →</a>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:.75rem;margin-top:1rem;">GELSİN platformu</p>
  </div></body></html>`
}

interface WebhookPayload {
  type: string
  table: string
  record: { job_id: string; provider_id: string; price: number }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } })
  try {
    const payload = (await req.json()) as WebhookPayload
    if (payload.type !== 'INSERT' || payload.table !== 'offers') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid event' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const { job_id, provider_id, price } = payload.record
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const [{ data: job }, { data: providerProfile }] = await Promise.all([
      supabase.from('jobs').select('id, title, customer_id').eq('id', job_id).single(),
      supabase.from('profiles').select('full_name').eq('id', provider_id).single(),
    ])
    if (!job?.customer_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Job or customer not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(job.customer_id)
    const toEmail = authUser?.user?.email
    if (!toEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'Customer email not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    const providerName = (providerProfile?.full_name as string) ?? 'Bir uzman'
    const jobTitle = (job.title as string) ?? 'İş ilanın'
    const offerPrice = typeof price === 'number' ? price.toFixed(2) : String(price)

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'Mail not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: 'İşine Yeni Bir Teklif Geldi! 💰',
        html: newOfferEmailHtml(providerName, offerPrice, jobTitle),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('Resend error', data)
      return new Response(JSON.stringify({ ok: false, error: data?.message ?? 'Send failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ ok: true, id: data?.id }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
