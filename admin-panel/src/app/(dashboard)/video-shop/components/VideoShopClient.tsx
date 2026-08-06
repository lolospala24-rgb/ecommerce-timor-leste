'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Loader2, PlayCircle, PencilLine, CheckCircle2, Clock3, Image as ImageIcon } from 'lucide-react';

interface VideoItem {
  id: number;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  isActive?: boolean;
  views?: number;
  likes?: number;
  shares?: number;
  product?: {
    id: number;
    name: string;
    thumbnail?: string | null;
  } | null;
}

function normalizeVideos(payload: unknown): VideoItem[] {
  if (Array.isArray(payload)) {
    return payload as VideoItem[];
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as Record<string, unknown>;

    if (Array.isArray(candidate.data)) {
      return candidate.data as VideoItem[];
    }

    if (Array.isArray(candidate.items)) {
      return candidate.items as VideoItem[];
    }
  }

  return [];
}

export function VideoShopClient() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/videos');
        const result = await response.json();
        if (result?.success) {
          setVideos(normalizeVideos(result.data ?? result));
        }
      } catch (error) {
        console.error('Failed to load videos', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Video List</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Daftar video yang berasal dari backend video module.</p>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat video...
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada video yang tersedia dari backend.
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => (
              <div key={video.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {video.thumbnailUrl || video.product?.thumbnail ? (
                      <Image
                        src={video.thumbnailUrl || video.product?.thumbnail || ''}
                        alt={video.title}
                        width={96}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{video.title}</p>
                    <p className="text-sm text-muted-foreground">{video.product?.name || 'No product linked'}</p>
                    <p className="text-xs text-muted-foreground">Views {video.views || 0} • Likes {video.likes || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={video.isActive ? 'default' : 'secondary'} className="gap-1">
                    {video.isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                    {video.isActive ? 'Published' : 'Draft'}
                  </Badge>
                  <Button size="icon" variant="outline"><PlayCircle className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline"><PencilLine className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline"><Eye className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
