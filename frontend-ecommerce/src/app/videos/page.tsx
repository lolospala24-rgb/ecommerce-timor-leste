'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VideoLayout,
  VideoContainer,
  VideoCard,
  VideoComments,
  VideoActions,
  FloatingActions,
  ProductSection,
  EmptyState,
  Button,
  FollowButton,
  BackButton,
} from './components';
import { useVideos, useVideo } from '@/hooks';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { CheckCircle, Grid3x3, List, X, ArrowLeft, Sparkles, MessageCircle, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function VideoShopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoading } = useUIStore();

  // Get query params
  const videoId = searchParams.get('v') || searchParams.get('id') || undefined;
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('q') || undefined;

  // Local state
  const [selectedVideoId, setSelectedVideoId] = useState<string | undefined>(videoId);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Reset loading state
  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  // Handle video selection
  const handleVideoSelect = (id: string) => {
    router.replace(`/videos/${id}`);
  };

  const handleBack = () => {
    router.replace('/videos');
  };

  const handleClearFilters = () => {
    router.push('/videos');
  };

  if (videoId) {
    return (
      <VideoLayout showRightSidebar={false}>
        <SingleVideoView videoId={videoId} onBack={handleBack} />
      </VideoLayout>
    );
  }

  return (
    <VideoLayout>
      <FeedView
        category={category}
        search={search}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onVideoSelect={handleVideoSelect}
        onClearFilters={handleClearFilters}
      />
    </VideoLayout>
  );
}

// ============================================================
// FEED VIEW COMPONENT
// ============================================================

interface FeedViewProps {
  category?: string;
  search?: string;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onVideoSelect: (id: string) => void;
  onClearFilters: () => void;
}

function FeedView({
  category,
  search,
  viewMode,
  onViewModeChange,
  onVideoSelect,
  onClearFilters,
}: FeedViewProps) {
  const router = useRouter();
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isError } = useVideos({
    category,
    search,
    limit: 12,
  });

  const videos = data?.pages?.flatMap((page: any) => page.data) || [];
  const totalVideos = data?.pages?.[0]?.meta?.total || 0;

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <FeedSkeleton viewMode={viewMode} />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-300">
        Unable to load the video feed right now. Please try again in a moment.
      </div>
    );
  }

  if (videos.length === 0) {
    if (search) {
      return <EmptySearch query={search} onClear={() => router.push('/videos')} />;
    }
    return <EmptyState iconName="film" title="No videos available" description="Check back later" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FeedHeader
        category={category}
        search={search}
        totalVideos={totalVideos}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onClearFilters={onClearFilters}
      />

      {/* Video Grid */}
      <FeedGrid
        videos={videos}
        viewMode={viewMode}
        onVideoSelect={onVideoSelect}
      />

      {/* Loading More */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 border-2 border-[#FF3B5C] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* End of Content */}
      {!hasNextPage && videos.length > 0 && (
        <div className="text-center py-8 text-sm text-[#A3A3A3]">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
}

// ============================================================
// SINGLE VIDEO VIEW COMPONENT
// ============================================================

interface SingleVideoViewProps {
  videoId: string;
  onBack: () => void;
}

function SingleVideoView({ videoId, onBack }: SingleVideoViewProps) {
  const router = useRouter();
  const { video, products, recommendations, isLoading, error } = useVideo(videoId);
  const [showComments, setShowComments] = useState(false);
  const previewComments = useMemo(() => {
    if (!video) return [];
    return [{ id: 'preview-1', content: 'Love this styling and the product flow.', user: { name: 'Mina' } }, { id: 'preview-2', content: 'The creator makes the shopping experience feel effortless.', user: { name: 'Dion' } }, { id: 'preview-3', content: 'Would love to see more bundles like this.', user: { name: 'Lia' } }].slice(0, 3);
  }, [video]);

  if (isLoading) {
    return <SingleVideoSkeleton onBack={onBack} />;
  }

  if (error || !video) {
    return (
      <EmptyState
        iconName="film"
        title="Video not found"
        description="The video you're looking for doesn't exist"
        action={{ label: 'Go Back', onClick: onBack }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <BackButton onClick={onBack} />

      <VideoContainer
        video={video}
        showFloatingActions={!showComments}
        autoPlay
        onProgress={() => {}}
      >
        <div className="rounded-[28px] border border-white/10 bg-[#111114]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="space-y-5">
            <VideoInfoSection video={video} onCommentToggle={() => setShowComments(!showComments)} />

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#151515]/80 p-3 text-sm text-[#A3A3A3]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FF3B5C]" />
                <span>Premium social commerce experience</span>
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span>Live shopping ready</span>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#151515]/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[#FF3B5C]" />
                  <h3 className="text-sm font-semibold text-white">Products in this video</h3>
                </div>
                {products && products.length > 0 && (
                  <span className="text-xs text-[#A3A3A3]">{products.length} items</span>
                )}
              </div>
              {products && products.length > 0 ? (
                <ProductSection products={products} />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0F0F12] p-4 text-sm text-[#A3A3A3]">
                  No products linked to this video yet.
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#151515]/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#6366F1]" />
                  <h3 className="text-sm font-semibold text-white">Comment preview</h3>
                </div>
                <button onClick={() => setShowComments(!showComments)} className="text-sm text-[#A3A3A3] hover:text-white">
                  {showComments ? 'Hide' : 'View all'}
                </button>
              </div>
              <div className="space-y-2">
                {previewComments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-white/10 bg-[#0F0F12] px-3 py-2 text-sm text-[#A3A3A3]">
                    <p className="font-medium text-white">{comment.user?.name}</p>
                    <p>{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <CommentsSection
              videoId={video.id}
              showComments={showComments}
              onToggle={() => setShowComments(!showComments)}
              commentCount={video.comments || 0}
            />

            {recommendations && recommendations.length > 0 && (
              <RecommendationsSection
                recommendations={recommendations}
                onVideoSelect={(id) => router.replace(`/videos/${id}`)}
              />
            )}
          </div>
        </div>
      </VideoContainer>

      <div className="md:hidden">
        <FloatingActions video={video} onCommentClick={() => setShowComments(!showComments)} />
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ============================================================
// FEED HEADER
// ============================================================

function FeedHeader({
  category,
  search,
  totalVideos,
  viewMode,
  onViewModeChange,
  onClearFilters,
}: {
  category?: string;
  search?: string;
  totalVideos: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {category ? `${category} Videos` : search ? `Search: ${search}` : 'For You'}
        </h1>
        <p className="text-sm text-[#A3A3A3]">{(totalVideos ?? 0).toLocaleString()} videos</p>
      </div>

      <div className="flex items-center gap-3">
        {/* View Mode Toggle */}
        <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />

        {/* Clear Filters */}
        {(category || search) && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="text-xs">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// VIEW MODE TOGGLE
// ============================================================

function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}) {
  return (
    <div className="flex bg-[#151515] rounded-lg border border-[rgba(255,255,255,0.05)] p-1">
      <button
        onClick={() => onViewModeChange('grid')}
        className={`p-1.5 rounded-md transition-all ${
          viewMode === 'grid' ? 'bg-[#FF3B5C] text-white' : 'text-[#A3A3A3] hover:text-white'
        }`}
      >
        <Grid3x3 className="h-4 w-4" />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`p-1.5 rounded-md transition-all ${
          viewMode === 'list' ? 'bg-[#FF3B5C] text-white' : 'text-[#A3A3A3] hover:text-white'
        }`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================
// FEED GRID
// ============================================================

function FeedGrid({
  videos,
  viewMode,
  onVideoSelect,
}: {
  videos: any[];
  viewMode: 'grid' | 'list';
  onVideoSelect: (id: string) => void;
}) {
  return (
    <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-4'}>
      {videos.map((video, index) => (
        <motion.div
          key={video.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.05, 0.5) }}
          onClick={() => onVideoSelect(video.id)}
          className="cursor-pointer"
        >
          <VideoCard
            video={video}
            variant={viewMode === 'list' ? 'horizontal' : 'vertical'}
            showCreator
            showActions={viewMode === 'list'}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================
// VIDEO INFO SECTION
// ============================================================

function VideoInfoSection({
  video,
  onCommentToggle,
}: {
  video: any;
  onCommentToggle: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">{video.title}</h1>
        {video.description && (
          <p className="mt-2 text-sm leading-6 text-[#A3A3A3]">{video.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-[#A3A3A3]">
          <span>{(video?.views ?? 0).toLocaleString()} views</span>
          <span>•</span>
          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {video.tags && video.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {video.tags.map((tag: string) => (
            <span
              key={tag}
              className="text-xs text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded-full cursor-pointer hover:bg-[#6366F1]/20 transition-colors"
              onClick={() => router.push(`/videos?q=${tag}`)}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {video.creator && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#151515]/80 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] font-bold text-white">
            {video.creator.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-white">{video.creator.name}</p>
              {video.creator.isVerified && <CheckCircle className="h-3.5 w-3.5 text-[#6366F1]" />}
            </div>
            <p className="text-xs text-[#A3A3A3]">{(video?.creator?.followers ?? 0).toLocaleString()} followers</p>
          </div>
          <FollowButton creatorId={video.creator.id} isFollowing={false} onToggle={() => {}} size="sm" />
        </div>
      )}

      <div className="hidden md:block">
        <VideoActions video={video} variant="inline" onCommentClick={onCommentToggle} />
      </div>
    </div>
  );
}

// ============================================================
// COMMENTS SECTION
// ============================================================

function CommentsSection({
  videoId,
  showComments,
  onToggle,
  commentCount,
}: {
  videoId: string;
  showComments: boolean;
  onToggle: () => void;
  commentCount: number;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#111114]/85 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors"
      >
        <span>{showComments ? 'Hide' : 'View'} comments</span>
        <span className="text-xs bg-[#1C1C1C] px-2 py-0.5 rounded-full">
          {commentCount}
        </span>
      </button>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <VideoComments videoId={videoId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// RECOMMENDATIONS SECTION
// ============================================================

function RecommendationsSection({
  recommendations,
  onVideoSelect,
}: {
  recommendations: any[];
  onVideoSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#111114]/85 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
      <h3 className="text-sm font-semibold text-white mb-3">Video Lainnya</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {recommendations.slice(0, 6).map((rec) => (
          <div
            key={rec.id}
            className="cursor-pointer"
            onClick={() => onVideoSelect(rec.id)}
          >
            <VideoCard
              video={rec}
              variant="compact"
              showCreator={false}
              showActions={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EMPTY SEARCH
// ============================================================

function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      iconName="search"
      title={`No results found for "${query}"`}
      description="Try adjusting your search or filter criteria"
      action={{ label: 'Clear Search', onClick: onClear }}
    />
  );
}

// ============================================================
// SKELETON LOADERS
// ============================================================

function FeedSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  const gridClass = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'grid grid-cols-1 gap-4';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 bg-[#151515]" />
          <Skeleton className="h-4 w-20 bg-[#151515]" />
        </div>
        <Skeleton className="h-9 w-24 bg-[#151515]" />
      </div>
      <div className={gridClass}>
        {[...Array(6)].map((_, i) => (
          <Skeleton
            key={i}
            className={viewMode === 'list' ? 'h-32' : 'h-[300px]'}
          />
        ))}
      </div>
    </div>
  );
}

function SingleVideoSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <button className="flex items-center gap-2 text-sm text-[#A3A3A3] mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </button>
      <div className="aspect-[9/16] rounded-2xl bg-[#151515] animate-pulse" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4 bg-[#151515]" />
        <Skeleton className="h-4 w-1/2 bg-[#151515]" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full bg-[#151515]" />
          <Skeleton className="h-10 flex-1 bg-[#151515]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// IMPORT SKELETON FROM UI
// ============================================================

import { Skeleton } from '@/components/ui/skeleton';

