import type { Metadata } from 'next'
import './globals.css'
import { NotificationProvider } from '@/components/NotificationProvider'

export const metadata: Metadata = {
  title: 'Gelsin.app - Kapınıza Kadar Hizmet',
  description: 'Tamir, temizlik, güzellik ve daha fazlası için güvenilir uzmanlar',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="overflow-x-hidden overflow-y-auto w-full min-h-dvh">
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  )
}
