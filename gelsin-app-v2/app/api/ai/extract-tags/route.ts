import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { job_id, description, title } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY yok' }, { status: 400 })
  }

  const prompt = `Aşağıdaki iş ilanından uzmanlık etiketlerini ayıkla.
İş başlığı: ${title}
İş açıklaması: ${description}

Sadece JSON array döndür, başka hiçbir şey yazma:
["etiket1", "etiket2", "etiket3"]

Kurallar:
- Maksimum 5 etiket
- Kısa ve öz (1-3 kelime)
- Teknik terimler öncelikli
- Türkçe olsun
- Örnek: ["İtalyan Boya", "Duvar", "25m2"]`

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  )

  const geminiData = await geminiRes.json()
  const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

  let tags: string[] = []
  try {
    const cleaned = aiText.replace(/```json|```/g, '').trim()
    tags = JSON.parse(cleaned)
  } catch {
    console.error('Tag parse hatası:', aiText)
  }

  // job_tags tablosuna kaydet
  if (tags.length > 0) {
    await supabase.from('job_tags').insert(
      tags.map(tag => ({
        job_id,
        tag: tag.toLowerCase().trim(),
      }))
    )
  }

  // Etiket eşleşen uzmanlara bildirim gönder
  const { data: matchingProviders } = await supabase
    .from('expertise_tags')
    .select('provider_id')
    .in('tag', tags.map(t => t.toLowerCase().trim()))

  if (matchingProviders && matchingProviders.length > 0) {
    const uniqueProviders = [...new Set(matchingProviders.map(p => p.provider_id))]

    await supabase.from('notifications').insert(
      uniqueProviders.map(provider_id => ({
        user_id: provider_id,
        title: '🎯 Sana Özel İş!',
        body: `"${title}" - Uzmanlık alanınla eşleşen yeni bir iş var!`,
        type: 'matched_job',
        is_read: false,
        related_job_id: job_id,
      }))
    )
  }

  return NextResponse.json({ tags, matched: matchingProviders?.length || 0 })
}
