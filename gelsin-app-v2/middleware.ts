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
  const isProviderOnboarding = pathname.startsWith('/provider/onboarding')

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

  // Giriş yapılmışsa profil rolünü oku
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as UserRole | null) ?? null

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
      const redirectRes = NextResponse.redirect(new URL('/provider/onboarding', req.url))
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

