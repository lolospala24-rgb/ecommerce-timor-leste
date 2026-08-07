'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VideoLayout } from './components/layout/VideoLayout';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface VideoShopErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Video Shop Error Boundary
 * 
 * Catches and displays errors gracefully with recovery options.
 * - Shows user-friendly error message
 * - Provides retry functionality
 * - Navigation options to recover
 * - Development error details (when in dev mode)
 */
export default function VideoShopError({ error, reset }: VideoShopErrorProps) {
  const router = useRouter();

  // Log error to console for debugging
  useEffect(() => {
    console.error('Video Shop Error:', error);
  }, [error]);

  return (
    <VideoLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        {/* Error Icon */}
        <div className="rounded-full bg-red-500/10 p-4 mb-6">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="text-[#A3A3A3] max-w-md mb-2">
          We're having trouble loading the video content. Please try again.
        </p>

        {/* Error Message (shown in production) */}
        {error.message && (
          <p className="text-sm text-red-400/60 max-w-md mb-6 font-mono">
            {error.message}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="default" onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          <Button variant="outline" onClick={() => router.push('/videos')} className="gap-2">
            <Home className="h-4 w-4" />
            Go to Videos
          </Button>

          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Development Error Details */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-[#151515] rounded-xl border border-[rgba(255,255,255,0.05)] text-left w-full max-w-2xl overflow-auto">
            <p className="text-xs text-[#A3A3A3] font-mono">
              {error.stack || error.message}
            </p>
          </div>
        )}
      </div>
    </VideoLayout>
  );
}