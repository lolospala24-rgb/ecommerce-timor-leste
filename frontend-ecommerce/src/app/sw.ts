/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API calls (cart, prices, stock, orders) must always be live data —
    // caching them would silently show stale prices/stock, exactly what
    // the Promotion feature's backend-is-the-source-of-truth design
    // depends on not happening. Only the app shell/static assets below
    // get cached.
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();

// Web Push — separate from Serwist's own precache/runtime-cache event
// listeners above; a service worker can have any number of listeners per
// event type, so this coexists with serwist.addEventListeners() without
// conflict. Payload shape is PushNotificationsService.PushPayload on the
// backend: { title, body, url?, icon? }.
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string; icon?: string };
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const title = payload.title || 'Lolospala';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body,
      icon: payload.icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: payload.url || '/' },
    }),
  );
});

// Focuses an already-open tab on the target URL instead of always opening a
// new one — most customers already have the storefront open in a tab when
// a push arrives.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url || '/';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = allClients.find((c) => 'focus' in c) as WindowClient | undefined;
      if (existing) {
        await existing.navigate(targetUrl);
        await existing.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
