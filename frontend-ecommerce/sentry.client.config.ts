// Auto-loaded by withSentryConfig's webpack plugin (see next.config.js) —
// nothing needs to import this file directly.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// No-op with no DSN set — this repo ships with no Sentry account
// configured yet; set NEXT_PUBLIC_SENTRY_DSN to turn reporting on.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  });
}
