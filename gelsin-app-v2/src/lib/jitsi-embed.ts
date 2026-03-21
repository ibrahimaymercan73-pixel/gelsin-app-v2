/**
 * Jitsi Meet (meet.jit.si) — paylaşılan gömme ayarları (müşteri + usta).
 * Tam özelleştirme için kendi Jitsi sunucunuz gerekebilir.
 */

export const JITSI_DOMAIN = 'meet.jit.si'
export const JITSI_SCRIPT = `https://${JITSI_DOMAIN}/external_api.js`

export type JitsiEmbedRole = 'customer' | 'provider'

/** IFrame API — dokümanda geçen ek metodlar */
export type JitsiApi = {
  dispose: () => void
  addEventListeners: (listeners: Record<string, (...args: unknown[]) => void>) => void
  executeCommand?: (command: string, ...args: unknown[]) => void
  getNumberOfParticipants?: () => number
  /** Bazı sürümlerde dizi veya Promise döner; dokümanda event ile de kullanılmış */
  getParticipantsInfo?: () => void | unknown[] | Promise<unknown[]>
  getRoomsInfo?: () => Promise<unknown>
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
        /** Bekleme salonu / lobby kapalı */
        enableLobby: false,
        enableNoisyMicDetection: false,
        disableModeratorIndicator: true,
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

const DISPLAY_NAME_REAPPLY_MS = [0, 50, 200, 800, 2000] as const
const REVEAL_UI_DELAY_MS = 280

function safeParticipantCount(api: JitsiApi): number {
  try {
    const n = api.getNumberOfParticipants?.()
    return typeof n === 'number' && !Number.isNaN(n) ? n : 0
  } catch {
    return 0
  }
}

function countParticipantsFromRoomsInfo(data: unknown): number {
  const d = data as {
    rooms?: Array<{ participants?: unknown[]; isMainRoom?: boolean }>
  }
  if (!d?.rooms?.length) return 0
  const main = d.rooms.find((r) => r.isMainRoom) || d.rooms[0]
  return main?.participants?.length ?? 0
}

function tryConsumeParticipantsInfoResult(raw: unknown, tryReveal: () => void) {
  if (Array.isArray(raw) && raw.length >= 2) tryReveal()
  else if (raw && typeof (raw as Promise<unknown[]>).then === 'function') {
    ;(raw as Promise<unknown[]>)
      .then((list) => {
        if (Array.isArray(list) && list.length >= 2) tryReveal()
      })
      .catch(() => {})
  }
}

export type JitsiMeetingListenerOptions = {
  displayNameForCommand: string
  isCancelled: () => boolean
  onRevealUI: () => void
  onRemoteLeft?: () => void
  onPasswordRequired?: () => void
  onReadyToClose: () => void
  onVideoConferenceLeft: () => void
  onWaitTimeout?: () => void
  waitForRemoteSeconds?: number
}

/**
 * Overlay videoConferenceJoined ile kapanmaz.
 * Karşı taraf: participantJoined veya odaya girişte zaten ≥2 kişi (getNumberOfParticipants / getParticipantsInfo / getRoomsInfo).
 * participantLeft (uzak): tekrar bekleme + zamanlayıcı yenilenir.
 */
export function createJitsiMeetingListeners(
  api: JitsiApi,
  options: JitsiMeetingListenerOptions
): {
  listeners: Record<string, (...args: unknown[]) => void>
  dispose: () => void
} {
  let localId: string | null = null
  let revealed = false
  let waitTimerId: number | null = null
  const timeoutIds: number[] = []

  const clearRemoteWaitTimer = () => {
    if (waitTimerId != null) {
      clearTimeout(waitTimerId)
      waitTimerId = null
    }
  }

  const startRemoteWaitTimer = () => {
    clearRemoteWaitTimer()
    const sec = options.waitForRemoteSeconds ?? 30
    waitTimerId = window.setTimeout(() => {
      waitTimerId = null
      if (revealed || options.isCancelled()) return
      options.onWaitTimeout?.()
    }, sec * 1000)
  }

  const applyDisplayName = () => {
    if (options.isCancelled()) return
    try {
      api.executeCommand?.('displayName', options.displayNameForCommand)
    } catch {
      /* ignore */
    }
  }

  const reveal = () => {
    if (revealed || options.isCancelled()) return
    revealed = true
    clearRemoteWaitTimer()
    const t = window.setTimeout(() => {
      if (!options.isCancelled()) options.onRevealUI()
    }, REVEAL_UI_DELAY_MS)
    timeoutIds.push(t)
  }

  const hideForRemoteLeft = () => {
    if (!revealed || options.isCancelled()) return
    revealed = false
    options.onRemoteLeft?.()
    startRemoteWaitTimer()
  }

  const tryRevealIfOthersAlreadyInRoom = () => {
    if (revealed || options.isCancelled()) return
    try {
      if (safeParticipantCount(api) >= 2) {
        reveal()
        return
      }
    } catch {
      /* ignore */
    }
    try {
      const raw = api.getParticipantsInfo?.()
      tryConsumeParticipantsInfoResult(raw, reveal)
    } catch {
      /* ignore */
    }
    const gr = api.getRoomsInfo
    if (typeof gr === 'function') {
      Promise.resolve(gr.call(api))
        .then((data: unknown) => {
          if (revealed || options.isCancelled()) return
          if (countParticipantsFromRoomsInfo(data) >= 2) reveal()
        })
        .catch(() => {})
    }
  }

  const listeners: Record<string, (...args: unknown[]) => void> = {
    videoConferenceJoined: (payload: unknown) => {
      const p = payload as { id?: string }
      localId = p?.id ?? null

      DISPLAY_NAME_REAPPLY_MS.forEach((ms) => {
        const tid = window.setTimeout(() => applyDisplayName(), ms)
        timeoutIds.push(tid)
      })

      startRemoteWaitTimer()
      tryRevealIfOthersAlreadyInRoom()
      ;[120, 400, 900, 1600].forEach((ms) => {
        timeoutIds.push(window.setTimeout(() => tryRevealIfOthersAlreadyInRoom(), ms))
      })
    },

    participantsInfo: (info: unknown) => {
      if (revealed || options.isCancelled()) return
      const list = info as unknown[]
      if (Array.isArray(list) && list.length >= 2) reveal()
    },

    participantJoined: (participant: unknown) => {
      const p = participant as { id?: string }
      if (!p?.id) return
      if (localId && p.id === localId) return
      if (!localId) {
        tryRevealIfOthersAlreadyInRoom()
        return
      }
      reveal()
    },

    participantLeft: (payload: unknown) => {
      const p = payload as { id?: string }
      if (!p?.id || !localId || p.id === localId) return
      hideForRemoteLeft()
    },

    passwordRequired: () => {
      options.onPasswordRequired?.()
    },

    readyToClose: () => options.onReadyToClose(),
    videoConferenceLeft: () => options.onVideoConferenceLeft(),
  }

  const dispose = () => {
    clearRemoteWaitTimer()
    timeoutIds.forEach((id) => clearTimeout(id))
    timeoutIds.length = 0
  }

  return { listeners, dispose }
}
