import { NextRequest, NextResponse } from 'next/server'

/**
 * Eski akış: müşteri tıklayınca doğrudan cüzdana yazıyordu — gerçek tahsilat yoktu.
 * Pro aşama ödemeleri yalnızca PayTR + webhook ile tamamlanır (/api/paytr/create-token).
 */
export async function POST(req: NextRequest) {
  void req.json().catch(() => ({}))
  return NextResponse.json(
    {
      error:
        'Bu aşama ödemesi artık yalnızca güvenli ödeme (PayTR) ile yapılır. İş detayında “Onayla & Öde” ile kart ekranını açın.',
      code: 'paytr_required',
    },
    { status: 410 }
  )
}
