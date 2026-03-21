import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function urlToInlinePart(url: string): Promise<{ mime_type: string; data: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const mime = res.headers.get('content-type') || 'image/jpeg'
    return { mime_type: mime.split(';')[0], data: buf.toString('base64') }
  } catch {
    return null
  }
}

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

    const { data: jobRow } = await supabase.from('jobs').select('title, description, provider_id').eq('id', milestone.job_id).single()

    if (!jobRow || jobRow.provider_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const photos = (milestone.photos as string[] | null) || []
    if (!Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: 'Önce fotoğraf yükleyin' }, { status: 400 })
    }

    const prompt = `
    Sen bir inşaat ve tadilat denetçisisin.
    İş başlığı: ${jobRow.title}
    Aşama: ${milestone.title}
    Açıklama: ${milestone.description}

    Bu fotoğrafları incele ve şunları değerlendir:
    1. İş tamamlanmış mı?
    2. Kalite standartlarına uygun mu?
    3. Görünür bir hata veya eksiklik var mı?

    Sonucu şu formatta ver:
    ONAY: EVET veya HAYIR
    RAPOR: Kısa değerlendirme (2-3 cümle)
  `

    const imageParts: { inline_data: { mime_type: string; data: string } }[] = []
    for (const u of photos) {
      const part = await urlToInlinePart(u)
      if (part) {
        imageParts.push({ inline_data: { mime_type: part.mime_type, data: part.data } })
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY tanımlı değil' }, { status: 500 })
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, ...imageParts],
            },
          ],
        }),
      }
    )

    const geminiData = await geminiRes.json()
    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const approved = aiText.includes('ONAY: EVET')
    const report = aiText.replace(/ONAY:\s*EVET/gi, '').replace(/ONAY:\s*HAYIR/gi, '').trim()

    await supabase
      .from('milestones')
      .update({
        ai_approved: approved,
        ai_report: report,
        status: approved ? 'ai_approved' : 'ai_rejected',
      })
      .eq('id', milestone_id)

    const { data: job } = await supabase.from('jobs').select('customer_id').eq('id', milestone.job_id).single()

    if (job && approved) {
      await supabase.from('notifications').insert({
        user_id: job.customer_id,
        title: '✅ AI Denetimi Tamamlandı!',
        body: `"${milestone.title}" aşaması AI tarafından onaylandı. Ödemeyi onaylayabilirsiniz.`,
        type: 'milestone_ai_approved',
        is_read: false,
        related_job_id: milestone.job_id,
      })
    }

    return NextResponse.json({ approved, report })
  } catch (e) {
    console.error('[check-milestone]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
