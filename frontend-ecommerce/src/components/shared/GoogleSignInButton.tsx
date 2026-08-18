'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { isFirebaseConfigured, signInWithGoogle } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface GoogleSignInButtonProps {
  onError?: (message: string) => void;
  label?: string;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A22 22 0 0 0 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A22 22 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2A22 22 0 0 0 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ onError, label = 'Login with Google' }: GoogleSignInButtonProps) {
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
      size="lg"
      className={cn(
        'group relative w-full justify-center gap-2.5 rounded-xl border-slate-200 bg-white text-[15px] font-semibold text-slate-800 shadow-sm',
        'transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.99]',
        'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
      )}
      disabled={isSubmitting}
      onClick={handleClick}
    >
      {isSubmitting ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin text-muted-foreground" />
      ) : (
        <GoogleIcon />
      )}
      <span>{isSubmitting ? 'Signing in…' : label}</span>
    </Button>
  );
}
