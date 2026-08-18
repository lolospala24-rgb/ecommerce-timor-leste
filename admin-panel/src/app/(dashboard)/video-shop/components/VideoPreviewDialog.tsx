'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { AdminVideo } from '@/hooks/useVideos';
import { VideoStatusBadge } from './VideoStatusBadge';

interface VideoPreviewDialogProps {
  video: AdminVideo | null;
  onOpenChange: (open: boolean) => void;
}

function StatItem({ icon: Icon, value, label }: { icon: typeof Eye; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="font-medium text-foreground">{value.toLocaleString()}</span>
      {label}
    </div>
  );
}

export function VideoPreviewDialog({ video, onOpenChange }: VideoPreviewDialogProps) {
  return (
    <Dialog open={!!video} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {video && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {video.title}
                <VideoStatusBadge status={video.status} />
              </DialogTitle>
            </DialogHeader>

            <div className="overflow-hidden rounded-lg bg-black">
              <video src={video.videoUrl} poster={video.thumbnailUrl ?? undefined} controls autoPlay className="max-h-[60vh] w-full" />
            </div>

            {video.description && <p className="text-sm text-muted-foreground">{video.description}</p>}

            <div className="flex flex-wrap items-center gap-4 border-t pt-3">
              <StatItem icon={Eye} value={video.views} label="views" />
              <StatItem icon={Heart} value={video.likes} label="likes" />
              <StatItem icon={MessageCircle} value={video._count?.comments ?? 0} label="comments" />
              <StatItem icon={Bookmark} value={video._count?.savedBy ?? 0} label="saves" />
              <StatItem icon={Share2} value={video.shares} label="shares" />
            </div>

            {video.product && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {video.product.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.product.thumbnail} alt={video.product.name} className="h-12 w-12 rounded-md object-cover" />
                )}
                <div>
                  <p className="text-sm font-medium">{video.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ${video.product.price.toFixed(2)}
                    {video.product.seller?.storeName ? ` · sold by ${video.product.seller.storeName}` : ''}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
