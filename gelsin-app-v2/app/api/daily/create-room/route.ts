import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { session_id } = await req.json()

  // Jitsi Meet - ücretsiz, API key gerektirmez
  const room_name = 'gelsin-' + session_id.replace(/-/g, '').slice(0, 12)
  const room_url = 'https://meet.jit.si/' + room_name

  return NextResponse.json({ room_url })
}

