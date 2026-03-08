import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MIN_DETECTION_CONFIDENCE = 0.7
const RATE_LIMIT_PER_MINUTE = 60

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean } {
  const now = Date.now()
  const windowMs = 60_000
  let entry = rateLimitMap.get(userId)
  if (!entry) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (now >= entry.resetAt) {
    entry.count = 1
    entry.resetAt = now + windowMs
    return { allowed: true }
  }
  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false }
  }
  entry.count++
  return { allowed: true }
}

type FaceAnnotation = {
  detectionConfidence?: number
  panAngle?: number
  tiltAngle?: number
  rollAngle?: number
}

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
      return NextResponse.json({ verified: false, error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const { allowed } = checkRateLimit(user.id)
    if (!allowed) {
      return NextResponse.json(
        { verified: false, error: 'Çok fazla istek. Lütfen bir dakika bekleyin.' },
        { status: 429 }
      )
    }

    if (!process.env.GOOGLE_VISION_API_KEY) {
      console.error('[verify-face] GOOGLE_VISION_API_KEY is not set')
      return NextResponse.json(
        { verified: false, error: 'API key eksik' },
        { status: 200 }
      )
    }

    const key = process.env.GOOGLE_VISION_API_KEY
    const body = await req.json().catch(() => ({}))
    let imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''
    if (!imageBase64) {
      return NextResponse.json(
        { verified: false, error: 'Görsel gönderilmedi' },
        { status: 400 }
      )
    }
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

    const visionRaw = await visionRes.text()
    let visionData: unknown
    try {
      visionData = JSON.parse(visionRaw)
    } catch {
      visionData = { raw: visionRaw }
    }
    console.log('[verify-face] Google Vision API full response:', JSON.stringify(visionData, null, 2))

    if (!visionRes.ok) {
      console.error('[verify-face] Vision API HTTP error:', visionRes.status, visionRaw)
      return NextResponse.json({
        verified: false,
        error: 'Yüz doğrulama servisi şu an kullanılamıyor.',
      })
    }

    const response = (visionData as { responses?: { faceAnnotations?: FaceAnnotation[] }[] })?.responses?.[0]
    const faceAnnotations = response?.faceAnnotations
    const face = Array.isArray(faceAnnotations) && faceAnnotations.length > 0 ? faceAnnotations[0] : null
    const confidence = face?.detectionConfidence ?? 0
    const hasFace = confidence >= MIN_DETECTION_CONFIDENCE

    if (hasFace && face) {
      const headEulerAngleY = face.panAngle ?? 0
      const headEulerAngleX = face.tiltAngle ?? 0
      return NextResponse.json({
        verified: true,
        headEulerAngleY,
        headEulerAngleX,
        detectionConfidence: confidence,
      })
    }

    return NextResponse.json({
      verified: false,
      error: 'Yüz tespit edilemedi',
      headEulerAngleY: undefined,
      headEulerAngleX: undefined,
      detectionConfidence: confidence || undefined,
    })
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error('[verify-face] Exception:', e)
    return NextResponse.json({
      verified: false,
      error: errMsg || 'Bir hata oluştu, lütfen tekrar deneyin.',
    })
  }
}
