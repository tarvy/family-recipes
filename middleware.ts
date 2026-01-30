import { type NextRequest, NextResponse } from 'next/server';

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

  // Login page: redirect to recipes if already authenticated
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/recipes', request.url));
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
