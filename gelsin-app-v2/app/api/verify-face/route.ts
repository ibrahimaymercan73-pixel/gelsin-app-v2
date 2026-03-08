import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MIN_DETECTION_CONFIDENCE = 0.7

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const key = process.env.GOOGLE_VISION_API_KEY
    if (!key) {
      return NextResponse.json(
        { error: 'Google Vision API yapılandırması eksik' },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => ({}))
    let imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''
    if (!imageBase64) {
      return NextResponse.json(
        { verified: false, message: 'Görsel gönderilmedi' },
        { status: 400 }
      )
    }
    // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,")
    if (imageBase64.includes(',')) {
      imageBase64 = imageBase64.split(',')[1]?.trim() || imageBase64
    }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'FACE_DETECTION', maxResults: 1 }],
            },
          ],
        }),
      }
    )

    if (!visionRes.ok) {
      const errText = await visionRes.text()
      console.error('[verify-face] Vision API error:', visionRes.status, errText)
      return NextResponse.json(
        { verified: false, message: 'Yüz doğrulama servisi şu an kullanılamıyor.' },
        { status: 200 }
      )
    }

    const visionData = await visionRes.json()
    const response = visionData.responses?.[0]
    const faceAnnotations = response?.faceAnnotations
    const hasFace =
      Array.isArray(faceAnnotations) &&
      faceAnnotations.length > 0 &&
      (faceAnnotations[0].detectionConfidence ?? 0) >= MIN_DETECTION_CONFIDENCE

    if (hasFace) {
      return NextResponse.json({ verified: true })
    }
    return NextResponse.json({
      verified: false,
      message: 'Yüz tespit edilemedi',
    })
  } catch (e) {
    console.error('[verify-face]', e)
    return NextResponse.json(
      { verified: false, message: 'Bir hata oluştu, lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
