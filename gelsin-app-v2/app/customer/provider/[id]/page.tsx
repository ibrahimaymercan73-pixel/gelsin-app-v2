'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ProviderProfileView } from './ProviderProfileView'

type ProfilePublic = {
  id: string
  full_name: string | null
  avatar_url: string | null
  face_verified?: boolean
  city: string | null
}

type ProviderProfile = {
  id: string
  bio: string | null
  rating: number | null
  total_reviews: number
  completed_jobs: number
  service_categories: string[]
  last_seen?: string | null
}

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  customer_id: string
}

type ServiceRow = {
  id: string
  title: string
  description: string | null
  price: number
  category_slug: string
  image_url: string | null
  city: string | null
}

export default function CustomerProviderProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [profile, setProfile] = useState<ProfilePublic | null>(null)
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null)
  const [reviews, setReviews] = useState<Array<ReviewRow & { customer_name: string | null }>>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const [profileRes, ppRes, reviewsRes, servicesRes] = await Promise.all([
        supabase.from('profiles_public').select('id, full_name, avatar_url, face_verified, city').eq('id', id).single(),
        supabase.from('provider_profiles').select('id, bio, rating, total_reviews, completed_jobs, service_categories, last_seen').eq('id', id).single(),
        supabase.from('reviews').select('id, rating, comment, created_at, customer_id').eq('provider_id', id).order('created_at', { ascending: false }).limit(50),
        supabase.from('provider_services').select('id, title, description, price, category_slug, image_url, city').eq('provider_id', id).eq('status', 'active').order('created_at', { ascending: false }),
      ])

      if (profileRes.error && profileRes.error.code !== 'PGRST116') {
        setError(profileRes.error.message)
        setLoading(false)
        return
      }
      setProfile(profileRes.data as ProfilePublic | null)

      if (ppRes.error && ppRes.error.code !== 'PGRST116') {
        setError(ppRes.error.message)
        setLoading(false)
        return
      }
      setProviderProfile(ppRes.data as ProviderProfile | null)

      const reviewRows = (reviewsRes.data || []) as ReviewRow[]
      const customerIds = Array.from(new Set(reviewRows.map((r) => r.customer_id)))
      let namesByCustomerId: Record<string, string | null> = {}
      if (customerIds.length > 0) {
        const { data: custProfiles } = await supabase.from('profiles_public').select('id, full_name').in('id', customerIds)
        namesByCustomerId = Object.fromEntries((custProfiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || null]))
      }
      setReviews(reviewRows.map((r) => ({ ...r, customer_name: namesByCustomerId[r.customer_id] ?? null })))
      setServices((servicesRes.data || []) as ServiceRow[])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-red-600">{error}</p>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Geri</button>
      </div>
    )
  }

  if (!profile && !providerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-gray-600">Uzman bulunamadı.</p>
        <Link href="/customer" className="btn-primary">Ana Sayfaya Dön</Link>
      </div>
    )
  }

  return <ProviderProfileView profile={profile} providerProfile={providerProfile} reviews={reviews} services={services} onBack={() => router.back()} />
}
