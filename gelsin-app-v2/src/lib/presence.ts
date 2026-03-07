/**
 * Usta çevrimiçi / son görülme metinleri (güven ve etkileşim için)
 */

const ONLINE_THRESHOLD_MINS = 5

export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false
  const t = new Date(lastSeen).getTime()
  return Date.now() - t <= ONLINE_THRESHOLD_MINS * 60 * 1000
}

/** Teklif kartı / liste: "10 dk önce", "2 saat önce", "Çevrimiçi" */
export function formatLastSeenRelative(lastSeen: string | null | undefined): string | null {
  if (!lastSeen) return null
  const ts = new Date(lastSeen).getTime()
  const diffMs = Date.now() - ts
  const diffMins = Math.floor(diffMs / (60 * 1000))
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffMins < ONLINE_THRESHOLD_MINS) return 'Çevrimiçi'
  if (diffMins < 60) return `${diffMins} dk önce aktifti`
  if (diffHours < 24) return `${diffHours} saat önce aktifti`
  if (diffDays < 7) return `${diffDays} gün önce aktifti`
  return `${diffDays} gün önce aktifti`
}

/** Sohbet header (WhatsApp tarzı): "Son görülme: 14:30" veya "Son görülme: 2 saat önce" */
export function formatLastSeenForChat(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'Son görülme bilgisi yok'
  const ts = new Date(lastSeen)
  const diffMs = Date.now() - ts.getTime()
  const diffMins = Math.floor(diffMs / (60 * 1000))
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffMins < ONLINE_THRESHOLD_MINS) return 'Çevrimiçi'
  if (diffMins < 60) return `Son görülme: ${diffMins} dk önce`
  if (diffHours < 24) return `Son görülme: ${diffHours} saat önce`
  if (diffDays === 1) return `Son görülme: dün ${ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays < 7) return `Son görülme: ${diffDays} gün önce`
  return `Son görülme: ${ts.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
}
