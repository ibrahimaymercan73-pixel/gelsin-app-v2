'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab { href: string; icon: string; label: string }

export default function BottomTabBar({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname()
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 max-w-7xl mx-auto"
      style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map(tab => {
          const isActive = pathname === tab.href
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-all min-w-[56px] ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`}>
              <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>{tab.icon}</span>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full" />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
