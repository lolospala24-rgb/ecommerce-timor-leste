'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Eye, Heart, MessageCircle, Sparkles, Plus, Search } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useAdminVideos, AdminVideo } from '@/hooks/useVideos';
import { VideosTable } from './components/VideosTable';
import { VideoForm } from './components/VideoForm';
import { VideoPreviewDialog } from './components/VideoPreviewDialog';
import { VideoCommentsModeration } from './components/VideoCommentsModeration';
import { VideoAnalytics } from './components/VideoAnalytics';

const PAGE_SIZE = 10;

export default function VideoManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<AdminVideo | null>(null);
  const [previewVideo, setPreviewVideo] = useState<AdminVideo | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  // Overview totals must reflect every video regardless of the Manage tab's
  // current filters — fetched separately from the filtered list below.
  const { data: overviewData, isLoading: isLoadingOverview } = useAdminVideos({ status: 'all', limit: 200 });
  const { data: listData, isLoading: isLoadingList, isFetching } = useAdminVideos({
    search: debouncedSearch,
    status,
    page,
    limit: PAGE_SIZE,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const overviewVideos = useMemo(() => overviewData?.items ?? [], [overviewData]);
  const listVideos = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const metrics = useMemo(() => {
    const views = overviewVideos.reduce((sum, item) => sum + item.views, 0);
    const likes = overviewVideos.reduce((sum, item) => sum + item.likes, 0);
    const comments = overviewVideos.reduce((sum, item) => sum + (item._count?.comments ?? 0), 0);

    return [
      {
        label: 'Total Videos',
        value: overviewVideos.length.toString(),
        change: `${overviewVideos.filter((item) => item.isActive).length} published`,
        icon: Play,
      },
      { label: 'Views', value: views.toLocaleString(), change: 'All time', icon: Eye },
      { label: 'Likes', value: likes.toLocaleString(), change: 'All time', icon: Heart },
      { label: 'Comments', value: comments.toLocaleString(), change: 'All time', icon: MessageCircle },
    ];
  }, [overviewVideos]);

  const handleOpenCreate = () => {
    setEditingVideo(null);
    setFormOpen(true);
  };

  const handleEdit = (video: AdminVideo) => {
    setEditingVideo(video);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingVideo(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Video Shopping</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Video Management</h1>
          <p className="text-sm text-muted-foreground">
            Upload, publish, and moderate the videos that power the customer video-shopping feed.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Video
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoadingOverview ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
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
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold">Recently uploaded</h3>
              <p className="mt-1 text-sm text-muted-foreground">The 5 most recently uploaded videos.</p>
              <div className="mt-4">
                {isLoadingOverview ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <VideosTable
                    videos={[...overviewVideos]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 5)}
                    onEdit={handleEdit}
                    onPreview={setPreviewVideo}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search video title..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    className="pl-8"
                  />
                </div>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value as typeof status);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingList ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
                  <VideosTable videos={listVideos} onEdit={handleEdit} onPreview={setPreviewVideo} />
                </div>
              )}

              {total > 0 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <VideoCommentsModeration />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <VideoAnalytics />
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Edit Video' : 'Upload Video'}</DialogTitle>
          </DialogHeader>
          <VideoForm
            key={editingVideo?.id ?? 'new'}
            video={editingVideo}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <VideoPreviewDialog video={previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)} />
    </div>
  );
}
