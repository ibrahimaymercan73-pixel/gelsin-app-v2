import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  console.log('=== AI CHECK MILESTONE BAŞLADI ===')

  try {
    const { milestone_id } = await req.json()
    console.log('Milestone ID:', milestone_id)

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
        { error: 'Milestone bulunamadı: ' + mError?.message },
        { status: 400 }
      )
    }

    const photos = milestone.photos || []
    console.log('Photos:', photos)

    if (photos.length === 0) {
      return NextResponse.json({ error: 'Fotoğraf yok' }, { status: 400 })
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY
    console.log('Gemini key var mı:', !!GEMINI_KEY)

    if (!GEMINI_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY tanımlı değil' },
        { status: 400 }
      )
    }

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

    // Fotoğrafları base64'e çevir
    const imageParts = []
    for (const url of photos.slice(0, 3)) {
      try {
        const imgRes = await fetch(url)
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        imageParts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64,
          },
        })
      } catch (imgErr) {
        console.error('Fotoğraf çekme hatası:', imgErr)
      }
    }

    console.log('Image parts sayısı:', imageParts.length)

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
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
    console.log('Gemini response:', JSON.stringify(geminiData).slice(0, 200))

    if (!geminiRes.ok) {
      return NextResponse.json(
        { error: 'Gemini hatası: ' + JSON.stringify(geminiData) },
        { status: 400 }
      )
    }

    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('AI text:', aiText)

    const approved = aiText.toUpperCase().includes('ONAY: EVET')
    const report = aiText
      .replace(/ONAY:\s*(EVET|HAYIR)/gi, '')
      .replace(/RAPOR:/gi, '')
      .trim()

    await supabase
      .from('milestones')
      .update({
        ai_approved: approved,
        ai_report: report,
        status: approved ? 'ai_approved' : 'ai_rejected',
      })
      .eq('id', milestone_id)

    if (approved && milestone.jobs?.customer_id) {
      await supabase.from('notifications').insert({
        user_id: milestone.jobs.customer_id,
        title: '✅ AI Denetimi Tamamlandı!',
        body: `"${milestone.title}" aşaması onaylandı. Ödemeyi onaylayabilirsiniz.`,
        type: 'milestone_ai_approved',
        is_read: false,
      })
    }

    console.log('=== AI CHECK MILESTONE TAMAMLANDI ===', { approved, report })
    return NextResponse.json({ approved, report })
  } catch (err: any) {
    console.error('=== AI CHECK MILESTONE HATASI ===', err)
    return NextResponse.json(
      { error: err.message || 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}
