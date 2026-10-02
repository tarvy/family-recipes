import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_POST_LOGIN_PATH, RETURN_TO_PARAM, sanitizeReturnTo } from '@/lib/auth/return-to';

const SESSION_COOKIE_NAME = 'session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;

  // Root path: redirect based on auth status
  if (pathname === '/') {
    const redirectPath = isAuthenticated ? '/recipes' : '/login';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Public recipe link: redirect signed-in users to the full experience
  if (pathname.startsWith('/r/') && isAuthenticated) {
    const slug = pathname.slice(3); // strip leading "/r/"
    return NextResponse.redirect(new URL(`/recipes/${slug}`, request.url));
  }

  // Login page: if already signed in, continue to the requested same-origin
  // `return_to` (e.g. the OAuth consent page) or fall back to recipes.
  // Stale cookies are cleared by /api/auth/status, so this cannot loop with
  // /authorize.
  if (pathname === '/login') {
    if (isAuthenticated) {
      const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get(RETURN_TO_PARAM));
      return NextResponse.redirect(new URL(returnTo ?? DEFAULT_POST_LOGIN_PATH, request.url));
    }
    return NextResponse.next();
  }

  // Protected routes: redirect to login if not authenticated
  const protectedPaths = ['/recipes', '/settings', '/shopping-list'];
  const isProtectedRoute = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api (API routes)
     * - mcp (MCP server route)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - Static assets (favicon, manifest, sw, icons)
     */
    '/((?!api|mcp|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)',
  ],
};
