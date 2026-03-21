import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { normalizeTrPhoneTo90 } from '@/lib/phone-tr'
import { findProfileByPhoneAndRole, getServiceSupabase, type IntendedRole } from '@/lib/login-phone-otp-server'

function hashOtp(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex')
}

function safeEqualHash(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const b = body as { phone?: string; code?: string; role?: string }
  const phoneRaw = typeof b.phone === 'string' ? b.phone : ''
  const codeRaw = typeof b.code === 'string' ? b.code.replace(/\D/g, '') : ''
  const roleRaw = b.role === 'provider' ? 'provider' : b.role === 'customer' ? 'customer' : null

  if (!phoneRaw || !codeRaw || !roleRaw) {
    return NextResponse.json({ error: 'Telefon, kod ve rol zorunludur.' }, { status: 400 })
  }

  if (codeRaw.length !== 6) {
    return NextResponse.json({ error: 'Doğrulama kodu 6 haneli olmalıdır.' }, { status: 400 })
  }

  const intendedRole = roleRaw as IntendedRole
  const phoneE164 = normalizeTrPhoneTo90(phoneRaw)
  if (!phoneE164) {
    return NextResponse.json({ error: 'Geçersiz telefon numarası.' }, { status: 400 })
  }

  const found = await findProfileByPhoneAndRole(supabase, phoneE164, intendedRole)
  if (!found.ok) {
    return NextResponse.json({ error: 'Hesap bulunamadı veya rol eşleşmiyor.' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const { data: rows, error: selErr } = await supabase
    .from('login_phone_otps')
    .select('id, code_hash, expires_at, consumed_at')
    .eq('phone_e164', phoneE164)
    .eq('intended_role', intendedRole)
    .is('consumed_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(5)

  if (selErr || !rows?.length) {
    return NextResponse.json({ error: 'Kod süresi dolmuş veya geçersiz. Yeni kod isteyin.' }, { status: 400 })
  }

  const expectedHash = hashOtp(codeRaw)
  const row = rows.find((r) => safeEqualHash(r.code_hash, expectedHash))
  if (!row) {
    return NextResponse.json({ error: 'Doğrulama kodu hatalı.' }, { status: 400 })
  }

  await supabase.from('login_phone_otps').update({ consumed_at: nowIso }).eq('id', row.id)

  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(found.profile.id)
  if (userErr || !userData?.user) {
    console.error('[otp/verify] getUserById', userErr)
    return NextResponse.json({ error: 'Kullanıcı oturumu açılamadı.' }, { status: 500 })
  }

  const email = userData.user.email?.trim()
  if (!email) {
    return NextResponse.json(
      {
        error:
          'Bu hesapta e-posta tanımlı değil; telefon ile oturum açılamıyor. Lütfen Google veya e-posta ile giriş yapın.',
      },
      { status: 400 }
    )
  }

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkErr || !linkData?.properties?.email_otp) {
    console.error('[otp/verify] generateLink', linkErr)
    return NextResponse.json({ error: 'Oturum bağlantısı oluşturulamadı.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    email,
    token: linkData.properties.email_otp,
  })
}
