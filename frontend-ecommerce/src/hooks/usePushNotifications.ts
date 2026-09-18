'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/product';

// Push API's applicationServerKey wants a raw Uint8Array, not the
// URL-safe-base64 string the VAPID public key is generated/transmitted as.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushSupportStatus = 'unsupported' | 'unsubscribed' | 'subscribed' | 'denied';

// Wraps the browser Push API + this app's /push/* endpoints. Never throws
// on unsupported browsers (iOS Safari not yet installed, older browsers) —
// `status` just stays 'unsupported' and callers hide their UI accordingly.
export function usePushNotifications() {
  const [status, setStatus] = useState<PushSupportStatus>('unsubscribed');
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? 'subscribed' : 'unsubscribed');
    } catch {
      setStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'unsubscribed');
        return false;
      }

      const keyRes = await api.get('/push/vapid-public-key');
      const publicKey = unwrapApiData<{ publicKey: string | null }>(keyRes)?.publicKey;
      if (!publicKey) return false; // VAPID not configured server-side

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // TS's lib.dom.d.ts wants ArrayBufferView<ArrayBuffer> specifically;
        // Uint8Array's own type param is the wider ArrayBufferLike (which
        // also covers SharedArrayBuffer) — a real mismatch only in the
        // type system, never at runtime, since this is always a plain
        // ArrayBuffer here.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await api.post('/push/subscribe', subscription.toJSON());
      setStatus('subscribed');
      return true;
    } catch (err) {
      console.error('Push subscribe failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setStatus('unsubscribed');
      return true;
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, subscribe, unsubscribe };
}
