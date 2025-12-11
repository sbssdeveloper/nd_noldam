import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { customRoutes } from './src/config/routes'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rewrite custom short routes (e.g., /login -> /web/login) while keeping the URL as-is
  for (const [fromPath, toPath] of Object.entries(customRoutes)) {
    // Match exact or nested (e.g., /post/123 if mapped)
    if (pathname === fromPath || pathname.startsWith(fromPath + '/')) {
      const suffix = pathname.slice(fromPath.length) // preserve any subpath after the match
      const destination = toPath + suffix
      const url = request.nextUrl.clone()
      url.pathname = destination
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
