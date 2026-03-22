import { NextRequest, NextResponse } from 'next/server'

/**
 * Eski akış: Gemini ile fotoğraf denetimi. Kaldırıldı — ödeme için manuel müşteri onayı kullanılıyor.
 * Fotoğraf yüklendikten sonra durum doğrudan `awaiting_customer` olur.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      status: 'deprecated',
      message:
        'AI aşama denetimi kapatıldı. Fotoğraflar yüklendikten sonra müşteri inceleyip ödeme yapar.',
      error: 'ai_check_disabled',
    },
    { status: 410 }
  )
}
