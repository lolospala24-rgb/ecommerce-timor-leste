'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Trophy, Loader2 } from 'lucide-react';

interface VideoAnalyticsItem {
  id: number;
  title: string;
  views?: number;
  likes?: number;
  shares?: number;
  product?: {
    name?: string;
  } | null;
}

export function VideoAnalytics() {
  const [videos, setVideos] = useState<VideoAnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/videos?limit=100');
        const result = await response.json();
        if (result?.success) {
          const payload = Array.isArray(result.data) ? result.data : result.data?.items ?? [];
          setVideos(payload);
        }
      } catch (error) {
        console.error('Failed to load analytics data', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const chartData = useMemo(() => {
    const totals = videos.slice(0, 7).map((video, index) => ({
      label: `V${index + 1}`,
      value: video.views || 0,
    }));

    return totals.length > 0 ? totals : [{ label: 'No data', value: 0 }];
  }, [videos]);

  const topProducts = useMemo(() => {
    return videos
      .map((video) => ({
        name: video.product?.name || video.title,
        views: (video.views || 0).toLocaleString(),
      }))
      .sort((a, b) => Number(b.views.replace(/,/g, '')) - Number(a.views.replace(/,/g, '')))
      .slice(0, 5);
  }, [videos]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Views per video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengambil data analytics...
            </div>
          ) : (
            chartData.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min((item.value / Math.max(...chartData.map((entry) => entry.value), 1)) * 100, 100)}%` }} />
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
            Top Video dari Backend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memuat ranking...
            </div>
          ) : (
            topProducts.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{item.views}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
