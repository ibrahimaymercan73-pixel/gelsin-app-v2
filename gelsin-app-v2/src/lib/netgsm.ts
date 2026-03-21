/**
 * Netgsm XML SMS API — https://api.netgsm.com.tr/sms/send/xml
 * Kimlik bilgileri ortam değişkenlerinden okunur (sunucu tarafı).
 */

export type NetgsmSendResult =
  | { ok: true; raw: string }
  | { ok: false; error: string; raw?: string }

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * @param destinationDigits Sadece rakamlar, ülke kodu ile (örn. 905551234567)
 */
export async function sendNetgsmSms(
  destinationDigits: string,
  message: string
): Promise<NetgsmSendResult> {
  const user = process.env.NETGSM_USER?.trim()
  const pass = process.env.NETGSM_PASS?.trim()
  const title = process.env.NETGSM_TITLE?.trim()

  if (!user || !pass || !title) {
    return { ok: false, error: 'Netgsm yapılandırması eksik (NETGSM_USER, NETGSM_PASS, NETGSM_TITLE)' }
  }

  const dest = destinationDigits.replace(/\D/g, '')
  if (!dest || dest.length < 10) {
    return { ok: false, error: 'Geçersiz telefon numarası' }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
  <header>
    <company dil="TR">Netgsm</company>
    <usercode>${escapeXml(user)}</usercode>
    <password>${escapeXml(pass)}</password>
    <type>1:n</type>
    <msgheader>${escapeXml(title)}</msgheader>
  </header>
  <body>
    <msg><![CDATA[${message}]]></msg>
    <no>${escapeXml(dest)}</no>
  </body>
</mainbody>`

  try {
    const res = await fetch('https://api.netgsm.com.tr/sms/send/xml', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
      },
      body: xml,
    })

    const raw = (await res.text()).trim()

    if (!res.ok) {
      return { ok: false, error: `Netgsm HTTP ${res.status}`, raw }
    }

    // Başarılı yanıtlar genelde "00" veya job id ile başlar; hata kodları dokümantasyona göre değişir
    if (raw.startsWith('30') || raw.startsWith('40') || raw.startsWith('50') || raw.startsWith('60')) {
      return { ok: false, error: `Netgsm hata: ${raw}`, raw }
    }

    return { ok: true, raw }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bilinmeyen hata'
    return { ok: false, error: `Netgsm isteği başarısız: ${msg}` }
  }
}
