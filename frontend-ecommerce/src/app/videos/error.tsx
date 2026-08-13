'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface VideoShopErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function VideoShopError({ error, reset }: VideoShopErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error('Video Shop Error:', error);
  }, [error]);

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
        <AlertTriangle className="h-6 w-6 text-neutral-400" />
      </div>
      <h1 className="text-lg font-semibold text-neutral-900">Something went wrong</h1>
      <p className="max-w-xs text-sm text-neutral-500">
        We&apos;re having trouble loading the video content. Please try again.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}
