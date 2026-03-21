import { NextRequest, NextResponse } from 'next/server'
import { randomInt, createHash } from 'crypto'
import { sendLoginOtpSms } from '@/lib/sms-service'
import { normalizeTrPhoneTo90 } from '@/lib/phone-tr'
import { findProfileByPhoneAndRole, getServiceSupabase, type IntendedRole } from '@/lib/login-phone-otp-server'

const OTP_TTL_MS = 2 * 60 * 1000
const RESEND_COOLDOWN_MS = 45 * 1000

function hashOtp(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex')
}

function generateSixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
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

  const b = body as { phone?: string; role?: string }
  const phoneRaw = typeof b.phone === 'string' ? b.phone : ''
  const roleRaw = b.role === 'provider' ? 'provider' : b.role === 'customer' ? 'customer' : null

  if (!phoneRaw || !roleRaw) {
    return NextResponse.json({ error: 'Telefon ve rol zorunludur.' }, { status: 400 })
  }

  const intendedRole = roleRaw as IntendedRole
  const phoneE164 = normalizeTrPhoneTo90(phoneRaw)
  if (!phoneE164) {
    return NextResponse.json({ error: 'Geçerli bir cep telefonu girin (05xx …).' }, { status: 400 })
  }

  const found = await findProfileByPhoneAndRole(supabase, phoneE164, intendedRole)
  if (!found.ok) {
    if (found.reason === 'wrong_role') {
      return NextResponse.json(
        {
          error:
            intendedRole === 'customer'
              ? 'Bu numara uzman hesabına kayıtlı. Lütfen "Uzman" sekmesini seçin veya e-posta ile giriş yapın.'
              : 'Bu numara müşteri hesabına kayıtlı. Lütfen "Müşteri" sekmesini seçin veya e-posta ile giriş yapın.',
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Bu telefon numarasıyla kayıtlı hesap bulunamadı.' },
      { status: 404 }
    )
  }

  const { data: recent } = await supabase
    .from('login_phone_otps')
    .select('created_at')
    .eq('phone_e164', phoneE164)
    .eq('intended_role', intendedRole)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recent?.created_at) {
    const last = new Date(recent.created_at).getTime()
    if (Date.now() - last < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Lütfen yeni kod istemeden önce bir süre bekleyin.' },
        { status: 429 }
      )
    }
  }

  const code = generateSixDigitCode()
  const codeHash = hashOtp(code)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

  const { error: insErr } = await supabase.from('login_phone_otps').insert({
    phone_e164: phoneE164,
    intended_role: intendedRole,
    code_hash: codeHash,
    expires_at: expiresAt,
  })

  if (insErr) {
    console.error('[otp/send] insert', insErr)
    return NextResponse.json({ error: 'Kod kaydedilemedi. Daha sonra tekrar deneyin.' }, { status: 500 })
  }

  const sms = await sendLoginOtpSms(phoneRaw, code)

  if (!sms.ok) {
    console.error('[otp/send] iletimerkezi', sms.error, sms.raw)
    return NextResponse.json(
      { error: 'SMS gönderilemedi. İleti Merkezi ayarlarını kontrol edin veya daha sonra deneyin.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
