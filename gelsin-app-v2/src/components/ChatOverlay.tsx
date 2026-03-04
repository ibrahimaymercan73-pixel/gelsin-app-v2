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
        <div className="pointer-events-auto relative flex flex-col w-full max-w-sm h-[420px] max-h-[70vh] rounded-3xl border border-slate-200 shadow-2xl bg-white overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center shadow-lg z-10"
          >
            ✕
          </button>
          <iframe
            src={`/chat/${jobId}?embed=1`}
            className="w-full h-full border-0 rounded-3xl"
          />
        </div>
      </div>
    )
  }

  // Mobil: tam ekran overlay, başlık içerideki sohbet componentinden gelir
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60">
      <iframe
        src={`/chat/${jobId}?embed=1`}
        className="w-full h-full border-0 bg-white"
      />
    </div>
  )
}

