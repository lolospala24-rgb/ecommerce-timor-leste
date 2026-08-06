'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Eye, Heart, Share2, BarChart3, Sparkles, Plus, Loader2 } from 'lucide-react';
import { VideoManagementTable } from './components/VideoManagementTable';
import { VideoUploadForm } from './components/VideoUploadForm';
import { VideoAnalytics } from './components/VideoAnalytics';
import { VideoSettings } from './components/VideoSettings';

interface VideoSummary {
  id: number;
  title: string;
  views?: number;
  likes?: number;
  shares?: number;
  isActive?: boolean;
}

export default function VideoShopPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const response = await fetch('/api/videos?limit=100');
        const result = await response.json();
        if (result?.success) {
          const payload = Array.isArray(result.data) ? result.data : result.data?.items ?? [];
          setVideos(payload);
        }
      } catch (error) {
        console.error('Failed to load video summaries', error);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  const metrics = useMemo(() => {
    const total = videos.length;
    const views = videos.reduce((sum, item) => sum + (item.views || 0), 0);
    const likes = videos.reduce((sum, item) => sum + (item.likes || 0), 0);
    const shares = videos.reduce((sum, item) => sum + (item.shares || 0), 0);

    return [
      { label: 'Total Video', value: total.toString(), change: `${videos.filter((item) => item.isActive).length} published`, icon: Play },
      { label: 'Views', value: views.toLocaleString(), change: 'Live from backend', icon: Eye },
      { label: 'Likes', value: likes.toLocaleString(), change: 'Live from backend', icon: Heart },
      { label: 'Shares', value: shares.toLocaleString(), change: 'Live from backend', icon: Share2 },
    ];
  }, [videos]);

  const funnel = useMemo(() => [
    { label: 'Published Videos', value: videos.filter((item) => item.isActive).length.toString(), color: 'bg-blue-500' },
    { label: 'Draft Videos', value: videos.filter((item) => !item.isActive).length.toString(), color: 'bg-violet-500' },
    { label: 'Total Engagement', value: (videos.reduce((sum, item) => sum + (item.views || 0), 0) + videos.reduce((sum, item) => sum + (item.likes || 0), 0)).toLocaleString(), color: 'bg-emerald-500' },
  ], [videos]);

  const heroCards = useMemo(() => [
    { title: 'Video Management', description: 'Kelola video, status publish, dan preview.', href: '/dashboard/video-shop?tab=manage' },
    { title: 'Analytics', description: 'Pantau performa video dan top product.', href: '/dashboard/video-shop?tab=analytics' },
    { title: 'Settings', description: 'Atur autoplay, mute, infinite scroll, dan banner.', href: '/dashboard/video-shop?tab=settings' },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Video Shop</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Video Shop</h1>
          <p className="text-sm text-muted-foreground">Pantau performa konten video, status publikasi, dan metrik engagement.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/video-shop?tab=manage">
            <Plus className="mr-2 h-4 w-4" />
            Upload Video
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Mengambil data dari backend...
          </div>
        ) : (
          metrics.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-emerald-600">{item.change}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manage">Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Funnel engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {funnel.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: item.label === 'Conversion Rate' ? '60%' : '80%' }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="grid gap-4">
              {heroCards.map((item) => (
                <Card key={item.title} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href={item.href}>Buka</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <VideoUploadForm onSaved={() => {
            setLoading(true);
            fetch('/api/videos?limit=100')
              .then((response) => response.json())
              .then((result) => {
                if (result?.success) {
                  const payload = Array.isArray(result.data) ? result.data : result.data?.items ?? [];
                  setVideos(payload);
                }
              })
              .finally(() => setLoading(false));    
          }} />
          <VideoManagementTable />
        </TabsContent>
          
        <TabsContent value="analytics" className="space-y-4">
          <VideoAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <VideoSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
