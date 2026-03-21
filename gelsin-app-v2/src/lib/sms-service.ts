/**
 * İleti Merkezi SMS API v1 (GET)
 * https://api.iletimerkezi.com/v1/send-sms/get/
 *
 * Ortam değişkenleri:
 * - ILETIMERKEZI_KEY
 * - ILETIMERKEZI_HASH
 * - ILETIMERKEZI_SENDER (onaylı başlık, max 11 karakter)
 * - ILETIMERKEZI_IYS (opsiyonel, varsayılan "0") — "1" ise IYS sorgusu
 * - ILETIMERKEZI_IYS_LIST (opsiyonel, varsayılan BIREYSEL) — iys=1 iken gerekli
 */

import { normalizeTrPhoneTo90 } from '@/lib/phone-tr'

export type SmsSendResult =
  | { ok: true; raw: string; orderId?: string }
  | { ok: false; error: string; raw?: string }

/**
 * Girdi her formatta olabilir; önce 90 + 10 hane (905551234567) üretilir,
 * İleti Merkezi `receipents` alanı için 5xxxxxxxxx (10 hane, başta 5) formatına çevrilir.
 */
export function ensurePhoneWith90Prefix(input: string): string | null {
  return normalizeTrPhoneTo90(input)
}

function toIletiMerkeziReceipents(phoneE164Style: string): string | null {
  const d = phoneE164Style.replace(/\D/g, '')
  if (!d.startsWith('90') || d.length !== 12) return null
  const ten = d.slice(2)
  if (ten.length !== 10 || !ten.startsWith('5')) return null
  return ten
}

function parseIletiMerkeziResponse(xml: string): { code: string; message: string; orderId?: string } {
  const codeMatch = xml.match(/<code>\s*(\d+)\s*<\/code>/i)
  const msgMatch = xml.match(/<message>\s*([^<]*)\s*<\/message>/i)
  const idMatch = xml.match(/<id>\s*(\d+)\s*<\/id>/i)
  return {
    code: codeMatch?.[1] ?? '',
    message: msgMatch?.[1]?.trim() ?? '',
    orderId: idMatch?.[1],
  }
}

/**
 * 6 haneli giriş kodunu İleti Merkezi üzerinden gönderir.
 */
export async function sendLoginOtpSms(phoneInput: string, sixDigitCode: string): Promise<SmsSendResult> {
  const with90 = ensurePhoneWith90Prefix(phoneInput)
  if (!with90) {
    return { ok: false, error: 'Geçersiz telefon numarası' }
  }

  const receipents = toIletiMerkeziReceipents(with90)
  if (!receipents) {
    return { ok: false, error: 'Numara 90 ile cep formatına çevrilemedi' }
  }

  const key = process.env.ILETIMERKEZI_KEY?.trim()
  const hash = process.env.ILETIMERKEZI_HASH?.trim()
  const sender = process.env.ILETIMERKEZI_SENDER?.trim()
  const iys = (process.env.ILETIMERKEZI_IYS ?? '0').trim()
  const iysList = (process.env.ILETIMERKEZI_IYS_LIST ?? 'BIREYSEL').trim()

  if (!key || !hash || !sender) {
    return {
      ok: false,
      error: 'İleti Merkezi yapılandırması eksik (ILETIMERKEZI_KEY, ILETIMERKEZI_HASH, ILETIMERKEZI_SENDER)',
    }
  }

  // Aynı metin + alıcı 10 dk içinde tekrarlanırsa 451; mesajı hafifçe benzersizleştir
  const stamp = Date.now().toString(36).slice(-5)
  const text = `GELSIN giris kodunuz: ${sixDigitCode} (2 dk gecerli) ${stamp}`

  const params = new URLSearchParams({
    key,
    hash,
    text,
    receipents,
    sender,
    iys,
  })
  if (iys === '1') {
    params.set('iysList', iysList)
  }

  const url = `https://api.iletimerkezi.com/v1/send-sms/get/?${params.toString()}`

  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' })
    const raw = await res.text()

    const parsed = parseIletiMerkeziResponse(raw)
    if (parsed.code === '200') {
      return { ok: true, raw, orderId: parsed.orderId }
    }

    const hint = parsed.message || `Kod ${parsed.code || 'bilinmiyor'}`
    return { ok: false, error: `SMS gönderilemedi: ${hint}`, raw }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bilinmeyen hata'
    return { ok: false, error: `İleti Merkezi isteği başarısız: ${msg}` }
  }
}
