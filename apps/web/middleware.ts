import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — Route Protection
 *
 * Provides a lightweight, server-side check for protected routes.
 * Because JWTs are stored in memory (not cookies), we cannot fully
 * verify the token at the edge. Instead we check for the presence
 * of the Zustand-persisted `auth-storage` flag that indicates the
 * user has authenticated.  Full token verification still happens
 * on the API server for every data request.
 *
 * This middleware prevents unauthenticated users from even loading
 * the JS bundle for protected pages — a meaningful defense-in-depth.
 */

const PROTECTED_PREFIXES = [
  '/member',
  '/mentor',
  '/company',
  '/admin',
  '/settings',
  '/messages',
  '/bookmarks',
  '/notifications',
  '/profile',
  '/connections',
  '/dashboard',
];

const PUBLIC_PATHS = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/about',
  '/pricing',
  '/contact',
  '/help',
  '/accessibility',
  '/welcome',
  '/',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets / API routes / Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/brand') ||
    pathname.includes('.') // static files (favicon, images, etc.)
  ) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Read Zustand persisted auth state from cookie-like storage
  // Zustand persist uses localStorage, but we can check for an auth cookie
  // as a secondary signal. For now, we rely on the cookie set during login.
  const authCookie = request.cookies.get('auth-session');

  if (!authCookie?.value) {
    // Redirect to sign-in with a return URL
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|brand/).*)',
  ],
};
