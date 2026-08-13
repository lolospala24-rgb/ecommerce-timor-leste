'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';

interface VideoNavigationControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function VideoNavigationControls({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: VideoNavigationControlsProps) {
  return (
    <div className="hidden flex-col gap-3 lg:flex">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label="Previous video"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:opacity-30"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next video"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:opacity-30"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
