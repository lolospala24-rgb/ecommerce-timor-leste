import { Clapperboard } from 'lucide-react';

export function VideoEmptyState({
  title = 'No videos available yet',
  description = 'Check back later for new products and creators.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
        <Clapperboard className="h-7 w-7 text-neutral-400" />
      </div>
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      <p className="max-w-xs text-sm text-neutral-500">{description}</p>
    </div>
  );
}
