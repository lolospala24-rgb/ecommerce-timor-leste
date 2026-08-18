'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { isFirebaseConfigured, signInWithGoogle } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';

interface GoogleSignInButtonProps {
  onError?: (message: string) => void;
  label?: string;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.1c.95-2.85 3.6-4.97 6.73-4.97Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ onError, label = 'Continue with Google' }: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFirebaseConfigured()) {
    return null;
  }

  const handleClick = async () => {
    onError?.('');
    setIsSubmitting(true);
    try {
      const idToken = await signInWithGoogle();
      await loginWithGoogle(idToken);
    } catch (err: any) {
      // Firebase throws auth/popup-closed-by-user when the user just
      // dismisses the popup — that's not a real error, don't surface it.
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      onError?.(err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isSubmitting}
      onClick={handleClick}
    >
      {isSubmitting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <span className="mr-2 inline-flex"><GoogleIcon /></span>
      )}
      {label}
    </Button>
  );
}
