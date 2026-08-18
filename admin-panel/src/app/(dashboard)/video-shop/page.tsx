'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useSellers } from '@/hooks/useSellers';
import { useCategories } from '@/hooks/useCategories';
import { AdminVideo, VideoStatus, useAdminVideos, useVideoStatusCounts } from '@/hooks/useVideos';
import { VideosTable } from './components/VideosTable';
import { VideoForm } from './components/VideoForm';
import { VideoPreviewDialog } from './components/VideoPreviewDialog';
import { VideoDetailPanel } from './components/VideoDetailPanel';

const PAGE_SIZE = 10;

const STATUS_TABS: { id: VideoStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'REJECTED', label: 'Rejected' },
];

const SORT_OPTIONS: { value: string; label: string; sortBy: 'createdAt' | 'views' | 'likes'; sortOrder: 'asc' | 'desc' }[] = [
  { value: 'newest', label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'oldest', label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' },
  { value: 'most-viewed', label: 'Most Viewed', sortBy: 'views', sortOrder: 'desc' },
  { value: 'most-liked', label: 'Most Liked', sortBy: 'likes', sortOrder: 'desc' },
];

const VALID_STATUSES = new Set(['all', 'PENDING', 'PUBLISHED', 'SCHEDULED', 'REJECTED']);

export default function VideoManagementPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');
  const [status, setStatus] = useState<VideoStatus | 'all'>(
    initialStatus && VALID_STATUSES.has(initialStatus) ? (initialStatus as VideoStatus | 'all') : 'all',
  );
  const [search, setSearch] = useState('');
  const [sellerId, setSellerId] = useState<string>('all');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailVideo, setDetailVideo] = useState<AdminVideo | null>(null);
  const [previewVideo, setPreviewVideo] = useState<AdminVideo | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const sortOption = SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];

  const { data: statusCounts } = useVideoStatusCounts();
  const { data: sellersData } = useSellers({ limit: 100 });
  const { data: categoriesData } = useCategories({ limit: 100 });

  const { data: listData, isLoading, isFetching } = useAdminVideos({
    search: debouncedSearch,
    status,
    sellerId: sellerId !== 'all' ? Number(sellerId) : undefined,
    categoryId: categoryId !== 'all' ? Number(categoryId) : undefined,
    page,
    limit: PAGE_SIZE,
    sortBy: sortOption.sortBy,
    sortOrder: sortOption.sortOrder,
  });

  const videos = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sellers = sellersData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  const handleStatusChange = (value: VideoStatus | 'all') => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="flex h-full gap-0">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Videos</h1>
            <p className="text-sm text-muted-foreground">Manage all videos in your platform</p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b pb-1">
          {STATUS_TABS.map((tab) => {
            const count = statusCounts?.[tab.id === 'all' ? 'all' : tab.id] ?? 0;
            const active = status === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusChange(tab.id)}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <Select value={sellerId} onValueChange={(value) => { setSellerId(value); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="All Sellers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sellers</SelectItem>
                    {sellers.map((seller: any) => (
                      <SelectItem key={seller.id} value={String(seller.id)}>
                        {seller.storeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryId} onValueChange={(value) => { setCategoryId(value); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading videos...</div>
            ) : (
              <div className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
                <VideosTable
                  videos={videos}
                  onOpen={setDetailVideo}
                  onEdit={setDetailVideo}
                  onPreview={setPreviewVideo}
                />
              </div>
            )}

            {total > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} videos
                </span>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  showTotal={false}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {detailVideo && (
        <VideoDetailPanel
          video={detailVideo}
          onClose={() => setDetailVideo(null)}
          onPreview={setPreviewVideo}
        />
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Video</DialogTitle>
          </DialogHeader>
          <VideoForm onSuccess={() => setUploadOpen(false)} onCancel={() => setUploadOpen(false)} />
        </DialogContent>
      </Dialog>

      <VideoPreviewDialog video={previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)} />
    </div>
  );
}
