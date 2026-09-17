import { WifiOff } from 'lucide-react';

// Shown by the service worker's navigation fallback (see src/app/sw.ts)
// whenever a page navigation fails with no network and nothing cached for
// that URL — deliberately standalone (no header/nav, which need live data
// anyway) so it renders instantly from the precache even fully offline.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">You&apos;re offline</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Check your internet connection and try again. Pages you&apos;ve already visited may still be available.
        </p>
      </div>
    </div>
  );
}
