'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getCurrentUserAndRole } from '@/lib/auth'
import { Footer } from '@/components/Footer'
import Navbar from '@/components/gelsin/Navbar'
import HeroSection from '@/components/gelsin/HeroSection'
import CategoriesSection from '@/components/gelsin/CategoriesSection'
import TrendingSection from '@/components/gelsin/TrendingSection'
import HowItWorksSection from '@/components/gelsin/HowItWorksSection'
import TrustSection from '@/components/gelsin/TrustSection'
import TopProvidersSection from '@/components/gelsin/TopProvidersSection'
import BecomeProviderSection from '@/components/gelsin/BecomeProviderSection'
import TestimonialsSection from '@/components/gelsin/TestimonialsSection'
import StatsSection from '@/components/gelsin/StatsSection'
import FAQAndCitiesSection from '@/components/gelsin/FAQAndCitiesSection'
import CTASection from '@/components/gelsin/CTASection'

type ProviderRow = { id: string; full_name?: string | null; rating?: number | null; total_reviews?: number | null }

export default function LandingPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [stats, setStats] = useState({ jobs: 0, providers: 0 })

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash?.includes('type=recovery')) {
      router.replace('/update-password' + window.location.hash)
      return
    }
    const check = async () => {
      const { user, role } = await getCurrentUserAndRole()
      if (!user) return
      if (!role) {
        router.replace('/choose-role')
        return
      }
      if (role === 'customer') router.replace('/customer')
      else if (role === 'provider') router.replace('/provider')
      else if (role === 'admin') router.replace('/admin')
    }
    check()
  }, [router])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      try {
        const { data: prov } = await supabase
          .from('provider_list_public')
          .select('id, rating, total_reviews, full_name')
          .eq('status', 'approved')
          .limit(6)
        setProviders((prov || []).map((p: any) => ({ id: p.id, full_name: p.full_name ?? null, rating: p.rating ?? null, total_reviews: p.total_reviews ?? null })))
      } catch {
        setProviders([])
      }
      try {
        const { count: jobsCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed')
        const { count: provCount } = await supabase.from('provider_profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved')
        setStats({ jobs: jobsCount ?? 0, providers: provCount ?? 0 })
      } catch {
        setStats({ jobs: 0, providers: 0 })
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <HeroSection />
      <CategoriesSection />
      <TrendingSection />
      <HowItWorksSection />
      <TrustSection />
      <TopProvidersSection providers={providers} />
      <BecomeProviderSection />
      <TestimonialsSection />
      <StatsSection stats={stats} />
      <FAQAndCitiesSection />
      <CTASection />
      <Footer />
    </div>
  )
}
