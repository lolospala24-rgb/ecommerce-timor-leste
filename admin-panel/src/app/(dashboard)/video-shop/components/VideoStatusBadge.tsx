import { Badge } from '@/components/ui/badge';
import type { VideoStatus } from '@/hooks/useVideos';

const STATUS_STYLES: Record<VideoStatus, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  PENDING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  SCHEDULED: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  REJECTED: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const STATUS_LABELS: Record<VideoStatus, string> = {
  PUBLISHED: 'Published',
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  REJECTED: 'Rejected',
};

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  return <Badge className={`border-0 ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</Badge>;
}
