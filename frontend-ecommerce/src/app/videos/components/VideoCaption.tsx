import { BadgeCheck, Music2 } from 'lucide-react';
import { Video } from '@/types/video';

interface VideoCaptionProps {
  video: Video;
}

export function VideoCaption({ video }: VideoCaptionProps) {
  const creator = video.product?.seller;
  const soundLabel = creator?.storeName ? `Original sound - ${creator.storeName}` : 'Original sound';

  return (
    <div className="max-w-[85%] space-y-1.5 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
      {/* Desktop/tablet already shows this via the floating CreatorHeader
          (see VideoFeedItem) — below `lg` that header is hidden, so the
          store name moves down here instead, matching the redesigned
          mobile feed. */}
      {creator && (
        <div className="flex items-center gap-1 lg:hidden">
          <span className="truncate text-sm font-semibold">{creator.storeName}</span>
          {creator.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-[#17703F] text-white" />}
        </div>
      )}
      {video.description ? (
        <p className="line-clamp-2 text-sm leading-snug">{video.description}</p>
      ) : (
        <p className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</p>
      )}
      <div className="flex items-center gap-1.5 text-xs text-white/90">
        <Music2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{soundLabel}</span>
      </div>
    </div>
  );
}
