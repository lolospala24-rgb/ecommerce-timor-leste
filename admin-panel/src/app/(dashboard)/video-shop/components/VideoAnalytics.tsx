'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Trophy, MessageCircle } from 'lucide-react';
import { useAdminVideos } from '@/hooks/useVideos';

export function VideoAnalytics() {
  const { data, isLoading } = useAdminVideos({ status: 'all', limit: 100, sortBy: 'views', sortOrder: 'desc' });
  const videos = useMemo(() => data?.items ?? [], [data]);

  const chartData = useMemo(() => {
    const top = videos.slice(0, 7).map((video) => ({ label: video.title, value: video.views }));
    return top.length > 0 ? top : [{ label: 'No data', value: 0 }];
  }, [videos]);

  const maxViews = Math.max(...chartData.map((entry) => entry.value), 1);

  const topByLikes = useMemo(
    () => [...videos].sort((a, b) => b.likes - a.likes).slice(0, 5),
    [videos],
  );

  const topByComments = useMemo(
    () => [...videos].sort((a, b) => (b._count?.comments ?? 0) - (a._count?.comments ?? 0)).slice(0, 5),
    [videos],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Views by video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
          ) : (
            chartData.map((item, index) => (
              <div key={`${item.label}-${index}`}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 font-semibold">{item.value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.min((item.value / maxViews) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-primary" />
            Most liked videos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : topByLikes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No videos yet.</p>
          ) : (
            topByLikes.map((video, index) => (
              <div key={video.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <span className="max-w-[200px] truncate font-medium">{video.title}</span>
                </div>
                <span className="text-sm text-muted-foreground">{video.likes.toLocaleString()} likes</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-primary" />
            Most discussed videos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : topByComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            topByComments.map((video, index) => (
              <div key={video.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <span className="max-w-[240px] truncate font-medium">{video.title}</span>
                </div>
                <span className="text-sm text-muted-foreground">{video._count?.comments ?? 0} comments</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
