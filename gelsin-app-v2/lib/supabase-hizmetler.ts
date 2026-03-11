import { createBrowserClient } from '@supabase/ssr'

export function createHizmetlerClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_HIZMETLER_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_HIZMETLER_SUPABASE_ANON_KEY!
  )
}

