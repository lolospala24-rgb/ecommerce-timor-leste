import { sanitizeEvidence, maskCookieValue } from './security-audit.service';

describe('sanitizeEvidence', () => {
  it('escapes angle brackets so stored evidence can never be re-interpreted as HTML', () => {
    expect(sanitizeEvidence('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('redacts a long opaque token even without cookie-specific masking', () => {
    const longToken = 'a'.repeat(64);
    const result = sanitizeEvidence(`Authorization: Bearer ${longToken}`);
    expect(result).toContain('[redacted]');
    expect(result).not.toContain(longToken);
  });

  it('truncates very long evidence rather than storing it unbounded', () => {
    const long = 'a'.repeat(1000);
    const result = sanitizeEvidence(long);
    expect(result.length).toBeLessThan(1000);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('maskCookieValue', () => {
  it('replaces the live cookie value while keeping the name and attributes visible', () => {
    const raw = 'session_id=abc123secretvalue; Path=/; SameSite=Lax';
    const masked = maskCookieValue(raw);
    expect(masked).toBe('session_id=[value redacted]; Path=/; SameSite=Lax');
    expect(masked).not.toContain('abc123secretvalue');
  });

  it('never leaks a real access-token cookie value into stored evidence', () => {
    const raw = 'access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.somepayload.signature; HttpOnly; Secure';
    const masked = maskCookieValue(raw);
    expect(masked).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(masked).toContain('access_token=[value redacted]');
  });
});
