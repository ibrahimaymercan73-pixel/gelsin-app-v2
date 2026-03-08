'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UstaOnboardingAlias() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/choose-role')
  }, [router])
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F4F7FA]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
