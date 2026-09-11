import { assertUrlIsSafeToFetch, isPrivateOrReservedIp, SsrfViolationError } from './ssrf-guard.util';

describe('isPrivateOrReservedIp', () => {
  it.each([
    ['127.0.0.1', true],
    ['10.0.0.5', true],
    ['172.16.0.1', true],
    ['192.168.1.1', true],
    ['169.254.169.254', true], // cloud metadata endpoint
    ['0.0.0.0', true],
    ['100.64.0.1', true], // carrier-grade NAT
    ['8.8.8.8', false],
    ['1.1.1.1', false],
    ['93.184.216.34', false], // example.com's real (public) IP
  ])('treats %s as private=%s', (ip, expected) => {
    expect(isPrivateOrReservedIp(ip)).toBe(expected);
  });

  it.each([
    ['::1', true],
    ['fe80::1', true],
    ['fc00::1', true],
    ['::ffff:127.0.0.1', true],
    ['2606:4700:4700::1111', false], // Cloudflare public DNS
  ])('treats IPv6 %s as private=%s', (ip, expected) => {
    expect(isPrivateOrReservedIp(ip)).toBe(expected);
  });

  it('rejects an unparseable value rather than guessing', () => {
    expect(isPrivateOrReservedIp('not-an-ip')).toBe(true);
  });
});

describe('assertUrlIsSafeToFetch', () => {
  const allowedHost = 'example.com';

  it('rejects a URL whose host does not match the configured target', async () => {
    await expect(assertUrlIsSafeToFetch('https://evil.com/', { allowedHost })).rejects.toThrow(SsrfViolationError);
  });

  it('rejects a literal private IP even when the hostname string looks fine', async () => {
    await expect(
      assertUrlIsSafeToFetch('http://127.0.0.1/', { allowedHost: '127.0.0.1' }),
    ).rejects.toThrow(/private\/reserved/);
  });

  it('rejects a link-local / cloud-metadata literal IP', async () => {
    await expect(
      assertUrlIsSafeToFetch('http://169.254.169.254/latest/meta-data/', { allowedHost: '169.254.169.254' }),
    ).rejects.toThrow(SsrfViolationError);
  });

  it('rejects disallowed protocols like file://', async () => {
    await expect(assertUrlIsSafeToFetch('file:///etc/passwd', { allowedHost })).rejects.toThrow(
      /Disallowed protocol/,
    );
  });

  it('rejects a malformed URL instead of throwing an unrelated error', async () => {
    await expect(assertUrlIsSafeToFetch('not a url', { allowedHost })).rejects.toThrow(/Invalid URL/);
  });
});
