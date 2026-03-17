import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { session_id } = await req.json()

  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: `gelsin-${session_id}`,
      privacy: 'private',
      properties: {
        exp: Math.floor(Date.now() / 1000) + 3600,
        max_participants: 2,
        enable_chat: true,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  })

  const room = await res.json()
  return NextResponse.json({ room_url: room.url })
}

