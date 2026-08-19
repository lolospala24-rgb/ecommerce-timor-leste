import { NextRequest, NextResponse } from 'next/server';

// Content-Security-Policy lives here instead of next.config.js because it
// needs a fresh random nonce per request — next.config.js's headers() can
// only emit a static value. Next.js automatically applies this nonce to
// every script tag it renders (hydration/streaming/chunk loaders), and
// 'strict-dynamic' lets those trusted scripts load further scripts (e.g.
// the Firebase SDK's own apis.google.com loader) without needing every
// third-party script URL individually allow-listed. All other security
// headers (HSTS, X-Frame-Options, etc.) stay static in next.config.js.
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiWsUrl = apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' is what actually lets us drop 'unsafe-inline' and
    // 'unsafe-eval' here — Next.js's own injected scripts get the nonce,
    // and strict-dynamic propagates that trust to anything they load in
    // turn (webpack chunk loading, Firebase's gapi loader). The explicit
    // apis.google.com entry is a fallback only for browsers old enough not
    // to support strict-dynamic; browsers that do support it ignore it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com`,
    // No nonce equivalent exists for inline style *attributes* (only
    // <style> blocks) — Radix UI (positioning) and Framer Motion
    // (animations) both set styles via the DOM style attribute at
    // runtime, so this one can't be tightened without dropping those
    // libraries.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com http://res.cloudinary.com https://api.mapbox.com https://*.tiles.mapbox.com",
    "media-src 'self' blob: https://res.cloudinary.com http://res.cloudinary.com",
    "font-src 'self' data:",
    `connect-src 'self' ${apiUrl} ${apiWsUrl} https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
    "worker-src 'self' blob:",
    `frame-src 'self'${firebaseAuthDomain ? ` https://${firebaseAuthDomain}` : ''}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    // Skip Next's own static assets and image optimizer — they don't
    // render HTML, so a per-request nonce/CSP header on them is wasted
    // middleware work, not a security gap.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
