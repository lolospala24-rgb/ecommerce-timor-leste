// middleware.ts at project root
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/users',
  '/sellers',
  '/products',
  '/video-shop',
  '/categories',
  '/orders',
  '/payments',
  '/reports',
  '/reviews',
  '/shipping',
  '/couriers',
  '/profile',
  '/settings',
];

// Auth routes (redirect to dashboard if already logged in)
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

// Admin only routes
const adminRoutes = [
  '/users',
  '/sellers',
  '/categories',
  '/payments',
  '/reports',
  '/settings',
];

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

  // Redirect non-admins away from admin-only routes
  if (isAdminOnlyRoute && isLoggedIn && sessionRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
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