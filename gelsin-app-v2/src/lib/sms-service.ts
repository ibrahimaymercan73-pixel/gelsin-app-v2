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
  console.log('[sms-service / İleti Merkezi] sendLoginOtpSms çağrıldı', {
    hamGirdi: phoneInput,
    rakamSayisi: phoneInput.replace(/\D/g, '').length,
  })

  const with90 = ensurePhoneWith90Prefix(phoneInput)
  if (!with90) {
    console.warn('[sms-service / İleti Merkezi] Numara normalize edilemedi (90+10 hane beklenir)', {
      hamGirdi: phoneInput,
      sadeceRakam: phoneInput.replace(/\D/g, ''),
    })
    return { ok: false, error: 'Geçersiz telefon numarası' }
  }

  const receipents = toIletiMerkeziReceipents(with90)
  if (!receipents) {
    console.warn('[sms-service / İleti Merkezi] receipents formatı üretilemedi', {
      with90,
      beklenen: '90 ile 12 hane, sonraki 10 hane 5 ile başlamalı',
    })
    return { ok: false, error: 'Numara 90 ile cep formatına çevrilemedi' }
  }

  const key = process.env.ILETIMERKEZI_KEY?.trim()
  const hash = process.env.ILETIMERKEZI_HASH?.trim()
  const sender = process.env.ILETIMERKEZI_SENDER?.trim()
  const iys = (process.env.ILETIMERKEZI_IYS ?? '0').trim()
  const iysList = (process.env.ILETIMERKEZI_IYS_LIST ?? 'BIREYSEL').trim()

  if (!key || !hash || !sender) {
    console.warn('[sms-service / İleti Merkezi] Ortam değişkenleri eksik', {
      ILETIMERKEZI_KEY: Boolean(key),
      ILETIMERKEZI_HASH: Boolean(hash),
      ILETIMERKEZI_SENDER: Boolean(sender),
    })
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

  // Güvenlik: key/hash URL'de loglanmaz; yalnızca yapı ve alıcı formatı
  const logUrlSafe = `https://api.iletimerkezi.com/v1/send-sms/get/?key=***&hash=***&text=${encodeURIComponent(text)}&receipents=${receipents}&sender=${encodeURIComponent(sender)}&iys=${iys}${iys === '1' ? `&iysList=${encodeURIComponent(iysList)}` : ''}`

  console.log('[sms-service / İleti Merkezi] İstek özeti', {
    adim90: with90,
    iletiMerkeziReceipents: receipents,
    receipentsHane: receipents.length,
    receipentsBaslangic5: receipents.startsWith('5'),
    not: 'API receipents alanı 90 içermez; 5 ile başlayan 10 hane (örn. 5551234567)',
    sender,
    iys,
    iysList: iys === '1' ? iysList : undefined,
    keyTanimli: Boolean(key),
    hashTanimli: Boolean(hash),
    urlOrnekParametreler: logUrlSafe,
  })

  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' })
    const raw = await res.text()

    console.log('[sms-service / İleti Merkezi] HTTP yanıtı', {
      httpStatus: res.status,
      httpStatusText: res.statusText,
      responseBody: raw,
      responseBodyLength: raw.length,
    })

    const parsed = parseIletiMerkeziResponse(raw)
    if (parsed.code === '200') {
      console.log('[sms-service / İleti Merkezi] Başarılı (XML code=200)', {
        orderId: parsed.orderId,
        apiMessage: parsed.message,
      })
      return { ok: true, raw, orderId: parsed.orderId }
    }

    const hint = parsed.message || `Kod ${parsed.code || 'bilinmiyor'}`
    console.warn('[sms-service / İleti Merkezi] API hata kodu (XML)', {
      xmlCode: parsed.code,
      xmlMessage: parsed.message,
      httpStatus: res.status,
    })
    return { ok: false, error: `SMS gönderilemedi: ${hint}`, raw }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bilinmeyen hata'
    console.error('[sms-service / İleti Merkezi] fetch istisnası', {
      error: msg,
      stack: e instanceof Error ? e.stack : undefined,
    })
    return { ok: false, error: `İleti Merkezi isteği başarısız: ${msg}` }
  }
}
