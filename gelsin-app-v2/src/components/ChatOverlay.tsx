'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type ChatOverlayContextType = {
  openChat: (jobId: string) => void
  closeChat: () => void
}

const ChatOverlayContext = createContext<ChatOverlayContextType | undefined>(
  undefined
)

type ProviderProps = {
  children: React.ReactNode
}

export function ChatOverlayProvider({ children }: ProviderProps) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return
      setIsDesktop(window.innerWidth >= 1024)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Iframe içindeki sohbet sayfası "Kapat" deyince overlay'i kapat
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'close-chat') setJobId(null)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const openChat = (id: string) => setJobId(id)
  const closeChat = () => setJobId(null)

  return (
    <ChatOverlayContext.Provider value={{ openChat, closeChat }}>
      {children}
      {jobId && (
        <ChatOverlayFrame
          jobId={jobId}
          isDesktop={isDesktop}
          onClose={closeChat}
        />
      )}
    </ChatOverlayContext.Provider>
  )
}

export function useChatOverlay() {
  const ctx = useContext(ChatOverlayContext)
  if (!ctx) {
    throw new Error('useChatOverlay must be used within ChatOverlayProvider')
  }
  return ctx
}

type FrameProps = {
  jobId: string
  isDesktop: boolean
  onClose: () => void
}

function ChatOverlayFrame({ jobId, isDesktop, onClose }: FrameProps) {
  if (typeof window === 'undefined') return null

  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end justify-end pr-4 pb-4">
        <div className="pointer-events-auto flex flex-col w-full max-w-sm h-[460px] max-h-[75vh] rounded-3xl border border-slate-200 shadow-2xl bg-white overflow-hidden">
          {/* Üst şerit: iframe'in üzerine çıkmayacak, her zaman görünür */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
            <span className="text-xs font-semibold text-slate-500 truncate">Sohbet</span>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-800 text-white text-sm flex items-center justify-center font-bold"
              aria-label="Sohbeti kapat"
            >
              ✕
            </button>
          </div>
          <iframe
            src={`/chat/${jobId}?embed=1`}
            className="w-full flex-1 min-h-0 border-0 rounded-b-3xl"
          />
        </div>
      </div>
    )
  }

  // Mobil: tam ekran overlay, içteki sohbet header'ı + burada ekstra kapat butonu
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-stretch justify-center">
      <div className="relative w-full h-full">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-slate-900/80 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg"
        >
          Kapat
        </button>
        <iframe
          src={`/chat/${jobId}?embed=1`}
          className="w-full h-full border-0 bg-white"
        />
      </div>
    </div>
  )
}

