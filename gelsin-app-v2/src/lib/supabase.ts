import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (typeof window !== 'undefined' && anonKey) {
  try {
    const payload = JSON.parse(atob(anonKey.split('.')[1]))
    if (payload.role === 'service_role') {
      console.error(
        '[Supabase] 403 hatası: NEXT_PUBLIC_SUPABASE_ANON_KEY olarak SERVICE ROLE key kullanıyorsunuz. ' +
          "Dashboard → Project Settings → API → 'anon public' key'i kopyalayıp .env.local ve Vercel'de tanımlayın. " +
          "Service Role key sadece sunucu tarafında kullanılmalı, tarayıcıda asla kullanmayın."
      )
    }
  } catch {
    // JWT parse hatası – görmezden gel
  }
}

export const createClient = () => createBrowserClient(url, anonKey)

export type UserRole = 'customer' | 'provider' | 'admin'

export interface Profile {
  id: string
  phone: string
  full_name: string
  role: UserRole
  avatar_url?: string
  is_verified: boolean
  created_at: string
}

export interface ProviderProfile {
  id: string
  bio?: string
  service_categories: string[]
  rating: number
  total_reviews: number
  wallet_balance: number
  status: 'pending' | 'approved' | 'suspended'
  current_lat?: number
  current_lng?: number
  is_online: boolean
  id_document_url?: string
  criminal_record_url?: string
  profiles?: Profile
}

export interface Job {
  id: string
  customer_id: string
  provider_id?: string
  category_id: string
  title: string
  description?: string
  address: string
  lat: number
  lng: number
  status: 'open' | 'offered' | 'accepted' | 'started' | 'completed' | 'cancelled'
  job_type: 'urgent' | 'scheduled' | 'process'
  scheduled_at?: string
  agreed_price?: number
  platform_fee?: number
  provider_amount?: number
  qr_token?: string
  escrow_held: boolean
  payment_released: boolean
  created_at: string
  service_categories?: { name: string; icon: string }
  profiles?: Profile
}

export interface Offer {
  id: string
  job_id: string
  provider_id: string
  price: number
  estimated_duration?: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  profiles?: Profile
}
