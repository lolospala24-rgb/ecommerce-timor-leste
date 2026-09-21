'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { isFirebaseConfigured, signInWithGoogleCredential } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { AUTH_ROUTES } from '@/components/layout/ConditionalChrome';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

// Google Identity Services' real "One Tap" auto-prompt — offers sign-in to
// an anonymous visitor without them having to find a button first. Bridges
// the credential it returns into Firebase (signInWithGoogleCredential),
// then reuses the exact same loginWithGoogle() the manual button already
// calls — same session, same cookie, same backend verification, zero
// backend changes. Renders no visible JSX of its own; the prompt itself is
// a floating card Google's script injects directly into the page.
export function GoogleOneTap() {
  const pathname = usePathname();
  const { hasHydrated, isAuthenticated, loginWithGoogle } = useAuthStore();
  const [scriptReady, setScriptReady] = useState(false);
  const hasPrompted = useRef(false);

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.startsWith(route));
  const shouldOffer = scriptReady && hasHydrated && !isAuthenticated && !isAuthRoute;

  useEffect(() => {
    // Only ever prompt once per page load — re-running this every time
    // shouldOffer flips true/false (e.g. navigating between pages) would
    // nag the same already-dismissed visitor repeatedly.
    if (!shouldOffer || hasPrompted.current || !GOOGLE_CLIENT_ID || !window.google) return;
    hasPrompted.current = true;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      auto_select: false,
      cancel_on_tap_outside: true,
      // Required for One Tap to keep working under Chrome's third-party
      // cookie phase-out — omitting this is a common cause of the prompt
      // silently never appearing in current Chrome.
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        try {
          const firebaseIdToken = await signInWithGoogleCredential(response.credential);
          await loginWithGoogle(firebaseIdToken);
          toast.success('Signed in with Google');
        } catch {
          // loginWithGoogle already records the error in the auth store;
          // this is just the passive One Tap path, so failing quietly
          // (no visible dialog) is the right call — the manual button on
          // /login remains for anyone who wants to retry deliberately.
        }
      },
    });
    window.google.accounts.id.prompt();
  }, [shouldOffer, loginWithGoogle]);

  if (!GOOGLE_CLIENT_ID || !isFirebaseConfigured()) return null;

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={() => setScriptReady(true)}
    />
  );
}
