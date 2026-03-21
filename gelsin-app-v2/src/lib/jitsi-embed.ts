/**
 * Jitsi Meet (meet.jit.si) — paylaşılan gömme ayarları (müşteri + usta).
 * Tam özelleştirme için kendi Jitsi sunucunuz gerekebilir.
 */

export const JITSI_DOMAIN = 'meet.jit.si'
export const JITSI_SCRIPT = `https://${JITSI_DOMAIN}/external_api.js`

export type JitsiEmbedRole = 'customer' | 'provider'

export type JitsiApi = {
  dispose: () => void
  addEventListeners: (listeners: Record<string, (...args: unknown[]) => void>) => void
  executeCommand?: (command: string, ...args: unknown[]) => void
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi
  }
}

export function parseJitsiRoomName(roomUrl: string): string | null {
  try {
    const u = new URL(roomUrl)
    if (!u.hostname.replace(/^www\./, '').includes('jit.si')) return null
    const seg = u.pathname.replace(/^\//, '').split('/').filter(Boolean)[0]
    return seg ? decodeURIComponent(seg) : null
  } catch {
    return null
  }
}

export function loadJitsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.JitsiMeetExternalAPI) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${JITSI_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Jitsi script')))
      return
    }
    const s = document.createElement('script')
    s.src = JITSI_SCRIPT
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Jitsi script yüklenemedi'))
    document.body.appendChild(s)
  })
}

const TOOLBAR_MINIMAL = ['microphone', 'camera', 'hangup'] as const

/**
 * Görünen isim (userInfo + executeCommand için).
 * Müşteri tarafında: "Müşteri Veli" formatı.
 */
export function resolveJitsiDisplayName(rawFirstName: string, role: JitsiEmbedRole): string {
  const t = rawFirstName.trim() || (role === 'customer' ? 'Müşteri' : 'Uzman')
  if (role === 'customer') {
    const lower = t.toLowerCase()
    if (lower === 'müşteri' || lower.startsWith('müşteri ')) return t
    return `Müşteri ${t}`
  }
  return t
}

export function defaultRemoteDisplayNameForRole(role: JitsiEmbedRole): string {
  return role === 'customer' ? 'Uzman' : 'Müşteri'
}

export type JitsiMeetEmbedBundle = {
  /** API'ye spread edilecek userInfo + configOverwrite + interfaceConfigOverwrite */
  embedProps: {
    userInfo: { displayName: string }
    configOverwrite: Record<string, unknown>
    interfaceConfigOverwrite: Record<string, unknown>
  }
  /** videoConferenceJoined sonrası executeCommand('displayName', …) */
  displayNameForCommand: string
}

/** userInfo + configOverwrite + interfaceConfigOverwrite (+ komut için isim) */
export function getJitsiMeetEmbedBundle(
  rawDisplayName: string,
  role: JitsiEmbedRole = 'provider'
): JitsiMeetEmbedBundle {
  const toolbarMinimal = [...TOOLBAR_MINIMAL]
  const inMeetName = resolveJitsiDisplayName(rawDisplayName, role)
  const defaultRemote = defaultRemoteDisplayNameForRole(role)

  return {
    displayNameForCommand: inMeetName,
    embedProps: {
      userInfo: {
        displayName: inMeetName,
      },
      configOverwrite: {
        prejoinPageEnabled: false,
        skipPrejoinButton: true,
        disableDeepLinking: true,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        toolbarButtons: toolbarMinimal,
        subject: '',
        hideConferenceSubject: true,
        hideConferenceTimer: true,
        disablePolls: true,
        disableReactions: true,
        disablePrivateMessages: true,
        disableChat: true,
        disableProfile: true,
        disableSelfViewSettings: true,
        notifications: [],
        disableInviteFunctions: true,
        /** Ek giriş / uyarı ekranlarını azaltır (sunucu destekliyorsa) */
        enableWelcomePage: false,
        enableClosePage: false,
        enableInsecureRoomNameWarning: false,
        requireDisplayName: false,
        enableLobby: false,
        enableNoisyMicDetection: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: toolbarMinimal,
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        SHOW_CHROME_EXTENSION_BANNER: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        DISPLAY_WELCOME_PAGE_CONTENT: false,
        TOOLBAR_ALWAYS_VISIBLE: true,
        DEFAULT_BACKGROUND: '#0f172a',
        DEFAULT_REMOTE_DISPLAY_NAME: defaultRemote,
      },
    },
  }
}

/** @deprecated — doğrudan getJitsiMeetEmbedBundle(...).embedProps kullanın */
export function getJitsiMeetEmbedOptions(displayName: string) {
  const { embedProps } = getJitsiMeetEmbedBundle(displayName, 'provider')
  return embedProps
}
