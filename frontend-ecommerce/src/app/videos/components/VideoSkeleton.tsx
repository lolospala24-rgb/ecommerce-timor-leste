export function VideoSkeleton() {
  return (
    <div className="flex h-full w-full snap-center items-center justify-center py-4">
      <div className="relative h-full max-h-full w-full max-w-[420px] animate-pulse overflow-hidden rounded-2xl bg-neutral-200">
        <div className="absolute left-4 top-4 h-9 w-40 rounded-full bg-neutral-300/80" />
        <div className="absolute right-16 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 w-11 rounded-full bg-neutral-300/80" />
          ))}
        </div>
        <div className="absolute inset-x-4 bottom-4 space-y-3">
          <div className="h-3 w-2/3 rounded bg-neutral-300/80" />
          <div className="h-3 w-1/3 rounded bg-neutral-300/80" />
          <div className="h-16 w-full rounded-2xl bg-neutral-300/80" />
        </div>
      </div>
    </div>
  );
}
