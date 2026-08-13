import { AlertTriangle } from 'lucide-react';

export function VideoErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl bg-neutral-100 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
        <AlertTriangle className="h-6 w-6 text-neutral-400" />
      </div>
      <p className="text-sm font-medium text-neutral-700">Unable to load this video</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-700"
      >
        Try Again
      </button>
    </div>
  );
}
