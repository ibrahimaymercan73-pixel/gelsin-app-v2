import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type UserRole = 'customer' | 'provider' | 'admin'

function createSupabaseServerClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const pathname = url.pathname

  // Başlangıçta response'u oluştur (cookies için)
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createSupabaseServerClient(req, res)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = pathname === '/login' || pathname === '/onboarding' || pathname === '/'
  const isCustomerArea = pathname.startsWith('/customer')
  const isProviderArea = pathname.startsWith('/provider')
  const isAdminArea = pathname.startsWith('/admin')
  const isProviderOnboarding = pathname.startsWith('/provider/onboarding')

  // Giriş yapılmamış kullanıcılar için panel sayfalarını koru
  if (!user) {
    if (isCustomerArea || isProviderArea || isAdminArea) {
      const redirectUrl = new URL('/onboarding', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Onboarding / login vs. için giriş gerekmiyor
    return res
  }

  // Giriş yapılmışsa profil rolünü oku
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as UserRole | null) ?? null

  // Rol yoksa sayfanın kendi client-side mantığı devam etsin
  if (!role) return res

  // Usta onboarding zorunluluğu: kategori / onboarding tamamlanmamışsa provider alanlarına sokma
  if (role === 'provider' && isProviderArea && !isProviderOnboarding) {
    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('is_onboarded, service_categories')
      .eq('id', user.id)
      .single()

    const cats = (providerProfile?.service_categories as string[] | null) ?? []
    const needsOnboarding =
      !providerProfile?.is_onboarded || cats.length === 0

    if (needsOnboarding) {
      return NextResponse.redirect(new URL('/provider/onboarding', req.url))
    }
  }

  // Panel alanlarında rol guard
  if (isCustomerArea) {
    if (role === 'provider') {
      return NextResponse.redirect(new URL('/provider', req.url))
    }
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  if (isProviderArea) {
    if (role === 'customer') {
      return NextResponse.redirect(new URL('/customer', req.url))
    }
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  if (isAdminArea) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/customer', req.url))
    }
  }

  // Auth sayfalarına giren giriş yapmış kullanıcıları doğrudan paneline yönlendir
  if (isAuthPage) {
    if (role === 'customer') {
      return NextResponse.redirect(new URL('/customer', req.url))
    }
    if (role === 'provider') {
      return NextResponse.redirect(new URL('/provider', req.url))
    }
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/customer/:path*',
    '/provider/:path*',
    '/admin/:path*',
    '/onboarding',
    '/login',
    '/',
  ],
}

