'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error boundary caught an error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-red-100 p-3 mb-4">
        <AlertTriangle className="h-10 w-10 text-red-600" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold">Something went wrong</h2>
      <p className="mb-6 text-muted-foreground max-w-md">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button asChild>
          <Link href="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 text-left w-full max-w-2xl">
          <summary className="cursor-pointer text-sm font-medium">
            Error Details
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-100 p-4 text-xs">
            {error?.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
