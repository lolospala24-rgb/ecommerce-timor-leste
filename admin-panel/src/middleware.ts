// middleware.ts at project root
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication — kept in sync with every
// real page under (dashboard), mirroring Sidebar.tsx's menuSections/
// bottomMenuItems (previously these two lists had already drifted apart:
// /finance, /payouts, and /refunds were treated as admin-only below without
// ever being protected here in the first place, so an unauthenticated
// visitor hitting them got no edge-level login redirect at all).
const protectedRoutes = [
  '/dashboard',
  '/notifications',
  '/my-store',
  '/products',
  '/categories',
  '/video-shop',
  '/homepage',
  '/hero-banners',
  '/orders',
  '/coupons',
  '/reviews',
  '/finance',
  '/payments',
  '/payouts',
  '/refunds',
  '/users',
  '/sellers',
  '/shipping',
  '/couriers',
  '/live-tracking',
  '/municipalities',
  '/shipping-rates',
  '/shipping-dashboard',
  '/reports',
  '/profile',
  '/settings',
];

// Auth routes (redirect to dashboard if already logged in)
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

// Reachable by a SELLER account in addition to ADMIN — mirrors
// SELLER_ALLOWED_PATHS in (dashboard)/layout.tsx exactly (My Store is the
// only real seller-facing page in this app; Profile is generic to any
// logged-in user). Admin-only routes are derived below as everything else
// in protectedRoutes, so the two lists can't drift apart again.
const sellerAllowedRoutes = ['/my-store', '/profile'];
const adminRoutes = protectedRoutes.filter((route) => !sellerAllowedRoutes.includes(route));

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // The real auth token is an httpOnly cookie this middleware can't (and
  // shouldn't need to) read. `session_role` is a small non-sensitive marker
  // cookie — just the user's role string — set by authStore after a
  // successful login/checkAuth, used here purely for a fast pre-render
  // redirect. It is NOT the security boundary: every API call is still
  // authorized server-side by the backend's RolesGuard against the real
  // token, so a forged marker cookie only ever gets someone an empty shell
  // that fails to load any real data.
  const sessionRole = request.cookies.get('session_role')?.value;
  const isLoggedIn = Boolean(sessionRole);

  // Allow access to unauthorized page
  if (pathname === '/unauthorized') {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAuthRoute = authRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAdminOnlyRoute = adminRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect to login if accessing protected route without a session
  if (isProtectedRoute && !isLoggedIn) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect non-admins away from admin-only routes. A SELLER goes to
  // My Store (their actual landing page — see SELLER_ALLOWED_PATHS in
  // (dashboard)/layout.tsx) rather than the generic /unauthorized, which is
  // reserved for roles with no legitimate reason to be in this app at all.
  if (isAdminOnlyRoute && isLoggedIn && sessionRole !== 'ADMIN') {
    const destination = sessionRole === 'SELLER' ? '/my-store' : '/unauthorized';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Redirect to dashboard if accessing auth route with an active session
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};