'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

// A failed fetch and a genuinely empty list look identical if a page only
// checks `data.length === 0` — this makes the "we couldn't reach the
// server" case visually distinct instead of silently rendering as "0
// results found".
export function ErrorState({
  title = 'Failed to load',
  description = 'Something went wrong while fetching this data. Check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
