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

  let {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const { data: { session: refreshed } } = await supabase.auth.refreshSession()
      if (refreshed?.user) user = refreshed.user
    } else {
      user = session.user
    }
  }

  const isAuthPage = pathname === '/login' || pathname === '/onboarding' || pathname === '/'
  const isCustomerArea = pathname.startsWith('/customer')
  const isProviderArea = pathname.startsWith('/provider')
  const isAdminArea = pathname.startsWith('/admin')
  const isChatArea = pathname.startsWith('/chat')

  // Eski onboarding route → choose-role
  if (pathname.startsWith('/provider/onboarding')) {
    const redirectRes = NextResponse.redirect(new URL('/choose-role', req.url))
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
    return redirectRes
  }

  // Giriş yapılmamış kullanıcılar için panel ve sohbet sayfalarını koru
  if (!user) {
    if (isCustomerArea || isProviderArea || isAdminArea || isChatArea) {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirect', pathname)
      const redirectRes = NextResponse.redirect(redirectUrl)
      // Supabase'in güncellediği cookie'leri redirect response'a kopyala (session refresh vb.)
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
      return redirectRes
    }

    // Landing (/), onboarding ve login sayfaları herkes için serbest
    return res
  }

  // Giriş yapılmışsa profil rolünü, şehrini ve (provider/verify için) face_verified oku
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, city, face_verified')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as UserRole | null) ?? null
  const hasCity = !!(profile?.city && String(profile.city).trim())
  const faceVerified = !!profile?.face_verified
  const isChooseRole = pathname === '/choose-role'
  const isProviderVerify = pathname === '/provider/verify'

  // /provider/verify: sadece role=provider ve face_verified=false girebilir; doğrulamışsa /provider'a yönlendir
  if (isProviderVerify) {
    if (role !== 'provider') {
      const redirectUrl = role === 'admin' ? new URL('/admin', req.url) : new URL('/customer', req.url)
      const redirectRes = NextResponse.redirect(redirectUrl)
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
      return redirectRes
    }
    if (faceVerified) {
      const redirectRes = NextResponse.redirect(new URL('/provider', req.url))
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
      return redirectRes
    }
  }

  // Rol zaten atanmışsa /choose-role erişimini engelle, panele yönlendir
  if (role && isChooseRole) {
    if (role === 'customer' && hasCity) {
      const redirectRes = NextResponse.redirect(new URL('/customer', req.url))
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
      return redirectRes
    }
    if (role === 'provider' && hasCity) {
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('is_onboarded')
        .eq('id', user.id)
        .single()
      if (providerProfile?.is_onboarded) {
        const redirectRes = NextResponse.redirect(new URL('/provider', req.url))
        res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
        return redirectRes
      }
    }
  }

  // Rol yoksa: choose-role, şifre sıfırlama ve forgot-password sayfalarına izin ver
  if (!role) {
    const allowedNoRole = ['/choose-role', '/update-password', '/forgot-password']
    if (!allowedNoRole.includes(pathname)) {
      const redirectRes = NextResponse.redirect(new URL('/choose-role', req.url))
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
      return redirectRes
    }
    return res
  }

  // Onboarding kontrolü: city yoksa choose-role'a yönlendir
  if (role && !hasCity && !isChooseRole) {
    const redirectRes = NextResponse.redirect(new URL('/choose-role', req.url))
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
    return redirectRes
  }

  // Usta: onboarding (hizmetler) tamamlanmamışsa choose-role'a yönlendir
  if (role === 'provider' && isProviderArea) {
    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('is_onboarded, service_categories')
      .eq('id', user.id)
      .single()
    const cats = (providerProfile?.service_categories as string[] | null) ?? []
    const needsOnboarding = !providerProfile?.is_onboarded || cats.length === 0
    if (needsOnboarding && !isChooseRole) {
      const redirectRes = NextResponse.redirect(new URL('/choose-role', req.url))
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
      return redirectRes
    }
  }

  // Redirect'lere cookie kopyala (session'ın kaybolmaması için)
  const redirectWithCookies = (url: URL) => {
    const redirectRes = NextResponse.redirect(url)
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c))
    return redirectRes
  }

  // Panel alanlarında rol guard
  if (isCustomerArea) {
    if (role === 'provider') return redirectWithCookies(new URL('/provider', req.url))
    if (role === 'admin') return redirectWithCookies(new URL('/admin', req.url))
  }

  if (isProviderArea) {
    if (role === 'customer') return redirectWithCookies(new URL('/customer', req.url))
    if (role === 'admin') return redirectWithCookies(new URL('/admin', req.url))
  }

  if (isAdminArea) {
    if (role !== 'admin') return redirectWithCookies(new URL('/customer', req.url))
  }

  // Auth sayfalarına giren giriş yapmış kullanıcıları doğrudan paneline yönlendir
  if (isAuthPage) {
    if (role === 'customer') return redirectWithCookies(new URL('/customer', req.url))
    if (role === 'provider') return redirectWithCookies(new URL('/provider', req.url))
    if (role === 'admin') return redirectWithCookies(new URL('/admin', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/customer/:path*',
    '/provider/:path*',
    '/admin/:path*',
    '/chat/:path*',
    '/role-selection',
    '/choose-role',
    '/onboarding',
    '/login',
    '/forgot-password',
    '/update-password',
    '/',
  ],
}

