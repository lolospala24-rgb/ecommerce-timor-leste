import { Injectable, Logger } from '@nestjs/common';
import { fetchWithSsrfGuard, SsrfViolationError } from './utils/ssrf-guard.util';

export interface SecurityFinding {
  ruleId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
  affectedUrl: string;
  evidence?: string;
  documentationUrl?: string;
}

export interface SecurityAuditResult {
  score: number;
  findings: SecurityFinding[];
  checkedUrl: string;
}

const SEVERITY_DEDUCTION: Record<SecurityFinding['severity'], number> = {
  CRITICAL: 30,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 0,
};

// Lightweight, real, deterministic HTTP-level security checks — no OWASP
// ZAP or other active scanner (spec §7/§40 explicitly gate that behind an
// isolated, explicitly-authorized environment, which this single
// production VPS is not). Every finding here comes from actually reading
// response headers/cookies/HTML off the one allow-listed target domain via
// fetchWithSsrfGuard — never fabricated, never a guess.
@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  async auditUrl(url: string, allowedHost: string, timeoutMs: number): Promise<SecurityAuditResult> {
    const findings: SecurityFinding[] = [];
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') {
      findings.push({
        ruleId: 'security.https-missing',
        severity: 'CRITICAL',
        title: 'Site is not served over HTTPS',
        description: 'The audited URL was loaded over plain HTTP, not HTTPS.',
        recommendation: 'Serve the entire site over HTTPS and redirect all HTTP requests to HTTPS.',
        affectedUrl: url,
      });
    }

    let response: Response;
    try {
      response = await fetchWithSsrfGuard(url, { allowedHost, timeoutMs });
    } catch (error) {
      if (error instanceof SsrfViolationError) {
        // Never silently swallow this — an SSRF guard rejection means the
        // configured target itself may be misconfigured, which the admin
        // needs to know about, not a routine "page down" failure.
        this.logger.error(`SSRF guard rejected security audit target: ${error.message}`);
        throw error;
      }
      return {
        score: 0,
        checkedUrl: url,
        findings: [
          {
            ruleId: 'security.unreachable',
            severity: 'HIGH',
            title: 'Could not reach the target for security checks',
            description: error instanceof Error ? error.message : 'Unknown network error.',
            recommendation: 'Verify the URL is reachable and not blocking automated requests.',
            affectedUrl: url,
          },
        ],
      };
    }

    const headers = response.headers;

    this.checkHeader(findings, headers, url, {
      name: 'strict-transport-security',
      ruleId: 'security.hsts-missing',
      severity: 'HIGH',
      title: 'Missing HSTS header',
      description: 'The Strict-Transport-Security header is not set.',
      recommendation: 'Add "Strict-Transport-Security: max-age=63072000; includeSubDomains" to responses.',
      documentationUrl: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security',
    });

    this.checkHeader(findings, headers, url, {
      name: 'content-security-policy',
      ruleId: 'security.csp-missing',
      severity: 'HIGH',
      title: 'Missing Content-Security-Policy header',
      description: 'No Content-Security-Policy header was found.',
      recommendation: 'Define a Content-Security-Policy restricting script/style/image sources.',
      documentationUrl: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Security-Policy',
    });

    this.checkHeader(findings, headers, url, {
      name: 'x-content-type-options',
      ruleId: 'security.x-content-type-options-missing',
      severity: 'MEDIUM',
      title: 'Missing X-Content-Type-Options header',
      description: 'The X-Content-Type-Options: nosniff header is not set.',
      recommendation: 'Add "X-Content-Type-Options: nosniff" to prevent MIME-sniffing attacks.',
      documentationUrl: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Content-Type-Options',
    });

    const hasFrameProtection =
      headers.get('x-frame-options') || /frame-ancestors/i.test(headers.get('content-security-policy') ?? '');
    if (!hasFrameProtection) {
      findings.push({
        ruleId: 'security.clickjacking-protection-missing',
        severity: 'MEDIUM',
        title: 'Missing clickjacking protection',
        description: 'Neither X-Frame-Options nor a CSP frame-ancestors directive was found.',
        recommendation: 'Add "X-Frame-Options: DENY" or a CSP frame-ancestors directive.',
        affectedUrl: url,
        documentationUrl: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Frame-Options',
      });
    }

    this.checkHeader(findings, headers, url, {
      name: 'referrer-policy',
      ruleId: 'security.referrer-policy-missing',
      severity: 'LOW',
      title: 'Missing Referrer-Policy header',
      description: 'The Referrer-Policy header is not set.',
      recommendation: 'Add "Referrer-Policy: strict-origin-when-cross-origin" or stricter.',
      documentationUrl: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Referrer-Policy',
    });

    this.checkHeader(findings, headers, url, {
      name: 'permissions-policy',
      ruleId: 'security.permissions-policy-missing',
      severity: 'LOW',
      title: 'Missing Permissions-Policy header',
      description: 'The Permissions-Policy header is not set.',
      recommendation: 'Add a Permissions-Policy header to explicitly restrict powerful browser features.',
      documentationUrl: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Permissions-Policy',
    });

    this.checkCookies(findings, headers, url, parsed.protocol === 'https:');

    if (parsed.protocol === 'https:') {
      try {
        const html = await response.clone().text();
        this.checkMixedContent(findings, html, url);
      } catch {
        // Body already consumed or not text — not fatal, just skip this check.
      }
    }

    const score = this.scoreFromFindings(findings);
    return { score, findings, checkedUrl: url };
  }

  private checkHeader(
    findings: SecurityFinding[],
    headers: Headers,
    url: string,
    rule: {
      name: string;
      ruleId: string;
      severity: SecurityFinding['severity'];
      title: string;
      description: string;
      recommendation: string;
      documentationUrl?: string;
    },
  ) {
    if (!headers.get(rule.name)) {
      findings.push({
        ruleId: rule.ruleId,
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        recommendation: rule.recommendation,
        affectedUrl: url,
        documentationUrl: rule.documentationUrl,
      });
    }
  }

  private checkCookies(findings: SecurityFinding[], headers: Headers, url: string, isHttps: boolean) {
    // Headers.get('set-cookie') only returns the first one on some
    // runtimes — getSetCookie() (Node 20's undici implementation) returns
    // all of them, which matters since a page can set several cookies.
    const anyHeaders = headers as Headers & { getSetCookie?: () => string[] };
    const cookies = anyHeaders.getSetCookie?.() ?? [];

    for (const cookie of cookies) {
      const nameMatch = cookie.match(/^([^=]+)=/);
      const cookieName = nameMatch?.[1]?.trim() ?? 'unknown';
      const lower = cookie.toLowerCase();

      if (isHttps && !lower.includes('secure')) {
        findings.push({
          ruleId: 'security.cookie-insecure',
          severity: 'HIGH',
          title: `Cookie "${cookieName}" missing Secure flag`,
          description: `A cookie was set over HTTPS without the Secure attribute.`,
          recommendation: 'Set the Secure attribute on all cookies served over HTTPS.',
          affectedUrl: url,
          evidence: sanitizeEvidence(maskCookieValue(cookie)),
        });
      }
      if (!lower.includes('httponly')) {
        findings.push({
          ruleId: 'security.cookie-not-httponly',
          severity: 'MEDIUM',
          title: `Cookie "${cookieName}" missing HttpOnly flag`,
          description: 'A cookie was set without the HttpOnly attribute, making it readable by JavaScript.',
          recommendation: 'Set the HttpOnly attribute on cookies that do not need JavaScript access.',
          affectedUrl: url,
          evidence: sanitizeEvidence(maskCookieValue(cookie)),
        });
      }
      if (!lower.includes('samesite')) {
        findings.push({
          ruleId: 'security.cookie-samesite-missing',
          severity: 'LOW',
          title: `Cookie "${cookieName}" missing SameSite attribute`,
          description: 'A cookie was set without a SameSite attribute.',
          recommendation: 'Set SameSite=Lax or SameSite=Strict on cookies.',
          affectedUrl: url,
          evidence: sanitizeEvidence(maskCookieValue(cookie)),
        });
      }
    }
  }

  // Heuristic regex scan, not full DOM parsing — sufficient to catch the
  // common case (a hard-coded http:// image/script src) without adding a
  // new HTML-parsing dependency for this one check.
  private checkMixedContent(findings: SecurityFinding[], html: string, url: string) {
    const matches = html.match(/(?:src|href)=["']http:\/\/[^"']+["']/gi) ?? [];
    const unique = Array.from(new Set(matches)).slice(0, 10);
    if (unique.length > 0) {
      findings.push({
        ruleId: 'security.mixed-content',
        severity: 'HIGH',
        title: 'Mixed content detected',
        description: `Found ${matches.length} HTTP resource reference(s) on an HTTPS page.`,
        recommendation: 'Serve all page resources (images, scripts, stylesheets) over HTTPS.',
        affectedUrl: url,
        evidence: sanitizeEvidence(unique.join('\n')),
      });
    }
  }

  private scoreFromFindings(findings: SecurityFinding[]): number {
    const deduction = findings.reduce((sum, f) => sum + SEVERITY_DEDUCTION[f.severity], 0);
    return Math.max(0, 100 - deduction);
  }
}

// A Set-Cookie header's value IS a live credential (session id, CSRF
// token, etc.) — the finding is about which flags are missing, never about
// what the cookie is actually worth, so the value is replaced outright
// rather than relying on the generic length-based redaction in
// sanitizeEvidence below to happen to catch it.
export function maskCookieValue(setCookieHeader: string): string {
  return setCookieHeader.replace(/^([^=]+)=([^;]*)/, '$1=[value redacted]');
}

// Truncate + strip anything resembling a JWT/session-token value before
// storage — evidence is admin-facing but still gets escaped again at
// render time (React text nodes) and must never carry a live credential
// even at rest (spec §38 "never log secrets").
export function sanitizeEvidence(raw: string): string {
  const truncated = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
  return truncated
    .replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'))
    .replace(/([A-Za-z0-9_-]{40,})/g, '[redacted]');
}
