'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIos, isStandalone, useInstallPrompt } from '@/hooks/useInstallPrompt';

const DISMISSED_KEY = 'pwa-install-dismissed-at';
// Re-offer after this long — a customer who dismissed it once shouldn't be
// nagged every session, but a permanent dismissal also means someone who
// changes their mind never sees it again.
const RE_OFFER_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < RE_OFFER_AFTER_MS;
}

// Registers the Serwist-generated service worker and shows a small,
// dismissible "Install App" banner — Android/Chrome gets a real one-tap
// install via useInstallPrompt's captured beforeinstallprompt event; iOS
// Safari never fires that event, so it gets a short "Tap Share → Add to
// Home Screen" instruction instead. Never renders if the app is already
// installed (running standalone) or the visitor dismissed it recently.
export function PwaInstall() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal — the site works identically without the service worker,
      // it just loses install/offline capability for this visit.
    });
  }, []);

  useEffect(() => {
    setDismissed(isStandalone() || wasRecentlyDismissed());
    if (isIos()) setShowIosHint(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (dismissed || installed || !(canInstall || showIosHint)) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-3 shadow-lg sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 sm:rounded-lg sm:border"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {showIosHint && !canInstall ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install Lolospala App</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showIosHint && !canInstall
              ? 'Tap Share, then "Add to Home Screen" for faster access.'
              : 'Add to your home screen for a faster, app-like experience.'}
          </p>
          {canInstall && (
            <Button size="sm" className="mt-2" onClick={() => promptInstall().then((o) => o !== 'unavailable' && dismiss())}>
              Install
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
