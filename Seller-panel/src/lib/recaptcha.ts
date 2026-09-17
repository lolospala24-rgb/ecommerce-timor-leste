// reCAPTCHA v3 is score-based and invisible — no challenge UI, just a
// background token the backend verifies server-side against Google. If no
// site key is configured (e.g. local dev without one set up), login simply
// proceeds without a token — the backend's RecaptchaGuard already handles
// that case by skipping verification outside production.
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined' || !SITE_KEY) return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

// Resolves to undefined (not an empty string) when reCAPTCHA isn't
// configured or fails to load, so callers can omit the field entirely
// rather than sending a token that was never really generated.
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!SITE_KEY) return undefined;
  try {
    await loadScript();
    if (!window.grecaptcha) return undefined;
    return await new Promise<string>((resolve, reject) => {
      window.grecaptcha!.ready(() => {
        window.grecaptcha!.execute(SITE_KEY, { action }).then(resolve, reject);
      });
    });
  } catch {
    return undefined;
  }
}
