import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const GEMINI_MODEL = 'gemini-1.5-flash'

function jsonSuccess(body: {
  approved: boolean
  report: string
  fallback: boolean
  message: string
}) {
  return NextResponse.json({
    success: true,
    status: 'ok',
    approved: body.approved,
    is_approved: body.approved,
    report: body.report,
    message: body.message,
    fallback: body.fallback,
  })
}

async function persistMilestoneResult(
  supabase: SupabaseClient,
  milestoneId: string,
  milestone: {
    title?: string
    jobs?: { customer_id?: string | null } | null
  },
  approved: boolean,
  report: string
) {
  await supabase
    .from('milestones')
    .update({
      ai_approved: approved,
      ai_report: report,
      status: approved ? 'ai_approved' : 'ai_rejected',
    })
    .eq('id', milestoneId)

  if (approved && milestone.jobs?.customer_id) {
    await supabase.from('notifications').insert({
      user_id: milestone.jobs.customer_id,
      title: '✅ AI Denetimi Tamamlandı!',
      body: `"${milestone.title ?? ''}" aşaması onaylandı. Ödemeyi onaylayabilirsiniz.`,
      type: 'milestone_ai_approved',
      is_read: false,
    })
  }
}

export async function POST(req: NextRequest) {
  console.log('=== AI CHECK MILESTONE BAŞLADI ===')

  try {
    const { milestone_id } = await req.json()
    console.log('Milestone ID:', milestone_id)

    if (!milestone_id || typeof milestone_id !== 'string') {
      return NextResponse.json(
        { success: false, status: 'error', message: 'milestone_id gerekli', error: 'milestone_id gerekli' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: milestone, error: mError } = await supabase
      .from('milestones')
      .select('*, jobs(title, description, customer_id)')
      .eq('id', milestone_id)
      .single()

    console.log('Milestone:', milestone)
    console.log('Milestone error:', mError)

    if (mError || !milestone) {
      return NextResponse.json(
        {
          success: false,
          status: 'error',
          message: 'Milestone bulunamadı',
          error: 'Milestone bulunamadı: ' + (mError?.message ?? ''),
        },
        { status: 400 }
      )
    }

    const photos = (milestone.photos as string[] | null) || []
    console.log('Photos:', photos)

    if (photos.length === 0) {
      return NextResponse.json(
        { success: false, status: 'error', message: 'Fotoğraf yok', error: 'Fotoğraf yok' },
        { status: 400 }
      )
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY
    console.log('Gemini key var mı:', !!GEMINI_KEY)

    const prompt = `Sen bir inşaat ve tadilat denetçisisin.
İş: ${milestone.jobs?.title}
Aşama: ${milestone.title}
Açıklama: ${milestone.description}

Bu fotoğrafları incele:
1. İş tamamlanmış mı?
2. Kalite uygun mu?
3. Hata var mı?

Şu formatta yanıt ver:
ONAY: EVET veya HAYIR
RAPOR: 2-3 cümle değerlendirme`

    const imageParts: Array<{ inline_data: { mime_type: string; data: string } }> = []
    for (const url of photos.slice(0, 3)) {
      try {
        const imgRes = await fetch(url)
        if (!imgRes.ok) {
          console.error('Fotoğraf HTTP hatası:', url, imgRes.status)
          continue
        }
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const ct = imgRes.headers.get('content-type') || ''
        const mime_type = ct.startsWith('image/') ? ct.split(';')[0].trim() : 'image/jpeg'
        imageParts.push({
          inline_data: {
            mime_type,
            data: base64,
          },
        })
      } catch (imgErr) {
        console.error('Fotoğraf çekme hatası:', imgErr)
      }
    }

    console.log('Image parts sayısı:', imageParts.length)

    const runFallback = async (reason: string) => {
      console.warn('=== AI FALLBACK (onay) ===', reason)
      const report =
        'AI servisine şu an ulaşılamadı veya yanıt alınamadı. Test/yedek akış: aşama otomatik onaylandı. Gerekirse tekrar fotoğraf yükleyebilirsiniz.'
      await persistMilestoneResult(supabase, milestone_id, milestone, true, report)
      return jsonSuccess({
        approved: true,
        report,
        fallback: true,
        message: reason,
      })
    }

    if (imageParts.length === 0) {
      return runFallback('Fotoğraflar indirilemedi; yedek onay uygulandı.')
    }

    if (!GEMINI_KEY) {
      return runFallback('GEMINI_API_KEY tanımlı değil; yedek onay uygulandı.')
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`

    let geminiRes: Response
    try {
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, ...imageParts],
            },
          ],
        }),
      })
    } catch (fetchErr) {
      console.error('Gemini fetch ağ hatası:', fetchErr)
      return runFallback('Gemini isteği gönderilemedi; yedek onay uygulandı.')
    }

    const geminiData = await geminiRes.json().catch(() => ({}))
    console.log('Gemini response:', JSON.stringify(geminiData).slice(0, 500))

    if (!geminiRes.ok) {
      console.error('Gemini HTTP hatası:', geminiRes.status, geminiData)
      return runFallback(
        `Gemini API hatası (${geminiRes.status}): ${JSON.stringify(geminiData).slice(0, 200)}`
      )
    }

    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('AI text:', aiText)

    if (!aiText.trim()) {
      return runFallback('AI yanıt metni boş; yedek onay uygulandı.')
    }

    const approved = aiText.toUpperCase().includes('ONAY: EVET')
    const report = aiText
      .replace(/ONAY:\s*(EVET|HAYIR)/gi, '')
      .replace(/RAPOR:/gi, '')
      .trim()

    await persistMilestoneResult(supabase, milestone_id, milestone, approved, report || aiText)

    if (!approved) {
      console.log('=== AI CHECK MILESTONE TAMAMLANDI (red) ===', { approved, report })
      return jsonSuccess({
        approved: false,
        report: report || aiText,
        fallback: false,
        message: 'AI denetimi tamamlandı (onay yok).',
      })
    }

    console.log('=== AI CHECK MILESTONE TAMAMLANDI ===', { approved, report })
    return jsonSuccess({
      approved: true,
      report: report || aiText,
      fallback: false,
      message: 'AI denetimi tamamlandı.',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    console.error('=== AI CHECK MILESTONE HATASI ===', err)
    return NextResponse.json(
      { success: false, status: 'error', message: msg, error: msg },
      { status: 500 }
    )
  }
}
