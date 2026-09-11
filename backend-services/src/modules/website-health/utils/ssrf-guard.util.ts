import { promises as dnsPromises } from 'node:dns';
import { isIP } from 'node:net';

// Every audit check that has THIS server make an outbound HTTP request
// (the security header/cookie checks — PageSpeed Insights calls go to
// Google, which does its own fetching) must go through this guard first.
// The only thing that makes SSRF possible here at all is that an admin can
// pick which configured route to audit; this guard is what keeps "pick a
// route" from ever turning into "make our server request an arbitrary
// internal address" (spec §21).
//
// Deliberately NOT a generic "is this URL safe" checker for arbitrary
// admin-supplied URLs — this system never accepts a free-form URL from a
// request body. It only ever builds URLs by joining the one configured
// WebsiteHealthSettings.baseUrl with a fixed, developer-defined route
// template (see constants/audit-targets.ts). This guard is the second
// layer of defense against that base URL itself being misconfigured to
// something internal, plus protection against DNS-rebinding/redirect
// tricks once a request is actually in flight.

const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local, includes cloud metadata endpoints
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4], // multicast
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const target = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (target & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' || // loopback
    normalized === '::' ||
    normalized.startsWith('fe80:') || // link-local
    normalized.startsWith('fc') || // unique local fc00::/7
    normalized.startsWith('fd') ||
    normalized.startsWith('::ffff:127.') || // IPv4-mapped loopback
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:169.254.') ||
    normalized.startsWith('::ffff:192.168.')
  );
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // not a recognizable IP at all — reject rather than guess
}

export class SsrfViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfViolationError';
  }
}

export interface SsrfGuardOptions {
  /** The single admin-configured domain audits are ever allowed to target. */
  allowedHost: string;
}

// Validates that `url` targets the allowed host and that the hostname does
// not resolve to a private/loopback/link-local/metadata address. Does NOT
// itself fetch the URL — callers must re-validate after every redirect hop
// (see fetchWithSsrfGuard below), since a first-hop check can't see where
// a 3xx response will actually send the request next.
export async function assertUrlIsSafeToFetch(url: string, options: SsrfGuardOptions): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfViolationError(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new SsrfViolationError(`Disallowed protocol: ${parsed.protocol}`);
  }

  if (parsed.hostname.toLowerCase() !== options.allowedHost.toLowerCase()) {
    throw new SsrfViolationError(
      `URL host "${parsed.hostname}" does not match the configured audit target "${options.allowedHost}"`,
    );
  }

  // Literal IP in the URL (bypassing DNS) — check directly.
  if (isIP(parsed.hostname)) {
    if (isPrivateOrReservedIp(parsed.hostname)) {
      throw new SsrfViolationError(`URL resolves to a private/reserved address: ${parsed.hostname}`);
    }
    return;
  }

  // Resolve DNS ourselves and check every returned address — this is what
  // stops "allowed hostname today, DNS-rebound to an internal IP by the
  // time the real request goes out" attacks, not just a string comparison
  // against the configured host.
  let addresses: string[];
  try {
    const records = await dnsPromises.lookup(parsed.hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch (error) {
    throw new SsrfViolationError(`Could not resolve host: ${parsed.hostname}`);
  }

  if (addresses.length === 0) {
    throw new SsrfViolationError(`Host resolved to no addresses: ${parsed.hostname}`);
  }

  const unsafe = addresses.filter(isPrivateOrReservedIp);
  if (unsafe.length > 0) {
    throw new SsrfViolationError(
      `Host "${parsed.hostname}" resolved to a private/reserved address (${unsafe.join(', ')})`,
    );
  }
}

const MAX_REDIRECTS = 3;

// Fetches a URL that has already passed assertUrlIsSafeToFetch, re-checking
// the guard on every redirect hop before following it (manual redirect
// handling specifically so a redirect to an internal address is caught
// before the request is made, not after).
export async function fetchWithSsrfGuard(
  url: string,
  options: SsrfGuardOptions & { timeoutMs: number; headers?: Record<string, string> },
): Promise<Response> {
  let currentUrl = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertUrlIsSafeToFetch(currentUrl, options);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: options.headers,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }
  throw new SsrfViolationError(`Too many redirects (>${MAX_REDIRECTS}) while fetching ${url}`);
}
