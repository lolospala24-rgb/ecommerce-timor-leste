// Must be imported before anything else in main.ts — Sentry's Node SDK
// needs to patch modules (http, Prisma, etc.) before they're required
// elsewhere, which only works if init runs first.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

// No-op with no DSN set rather than throwing — this repo ships with no
// Sentry account configured yet; set SENTRY_DSN in the environment to
// turn reporting on, nothing else changes.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  });
}
