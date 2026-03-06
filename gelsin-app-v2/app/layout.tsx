import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gelsin.app - Kapınıza Kadar Hizmet',
  description: 'Tamir, temizlik, güzellik ve daha fazlası için güvenilir uzmanlar',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="overflow-x-hidden w-full min-h-dvh">{children}</body>
    </html>
  )
}
