import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fast pre-render gate only, based on the non-httpOnly `session_role` marker
// cookie set by authStore.ts. This can be forged client-side; it only saves
// a flash of dashboard UI before redirecting. The real boundary is the
// backend's RolesGuard checking the httpOnly token on every API call.
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('session_role')?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    if (role === 'SELLER' && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!role) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role !== 'SELLER') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
