import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
])
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'mp4'])

// Magic bytes (ilk birkaç byte) – sahte MIME’ı engellemek için
const MIME_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]],
}

function checkMagicBytes(buffer: Buffer, mime: string): boolean {
  if (mime === 'image/webp') {
    if (buffer.length < 12) return false
    if (buffer[0] !== 0x52 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x46) return false
    if (buffer[8] !== 0x57 || buffer[9] !== 0x45 || buffer[10] !== 0x42 || buffer[11] !== 0x50) return false
    return true
  }
  if (mime === 'video/mp4') {
    if (buffer.length < 12) return false
    const ftyp = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
    if (ftyp) return true
    return false
  }
  const signatures = MIME_SIGNATURES[mime]
  if (!signatures) return true
  for (const sig of signatures) {
    if (buffer.length < sig.length) continue
    const match = sig.every((byte, i) => buffer[i] === byte)
    if (match) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
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
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik (Supabase)' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) || 'job-media'
    const subpath = (formData.get('subpath') as string) || ''

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'Dosya gönderilmedi veya boş' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Dosya boyutu 10MB sınırını aşamaz' },
        { status: 400 }
      )
    }

    const mime = (file.type || '').toLowerCase()
    if (!ALLOWED_MIMES.has(mime)) {
      return NextResponse.json(
        { error: 'Sadece JPEG, PNG, WebP veya MP4 yüklenebilir' },
        { status: 400 }
      )
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Dosya uzantısı .jpg, .jpeg, .png, .webp veya .mp4 olmalıdır' },
        { status: 400 }
      )
    }

    if (bucket !== 'job-media' && bucket !== 'documents') {
      return NextResponse.json(
        { error: 'Geçersiz bucket' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (!checkMagicBytes(buffer, mime)) {
      return NextResponse.json(
        { error: 'Dosya içeriği belirtilen türle uyuşmuyor (güvenlik)' },
        { status: 400 }
      )
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    })

    const pathSegment = subpath ? `${subpath}-` : ''
    const path = `${user.id}/${pathSegment}${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
      })

    if (error) {
      console.error('[upload] storage error:', error)
      return NextResponse.json(
        { error: error.message || 'Yükleme başarısız' },
        { status: 502 }
      )
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return NextResponse.json({
      path: data.path,
      publicUrl: urlData.publicUrl,
    })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json(
      { error: 'Yükleme sırasında hata oluştu' },
      { status: 500 }
    )
  }
}
