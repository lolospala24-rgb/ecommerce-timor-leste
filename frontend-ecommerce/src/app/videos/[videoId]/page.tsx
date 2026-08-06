'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  VideoContainer,
  VideoComments,
  VideoActions,
  ProductSection,
  EmptyState,
  BackButton,
  FollowButton,
  Button,
} from '../components';
import { useVideo } from '@/hooks/useVideo';
import { useCreator } from '@/hooks/useCreator';
import { useComments } from '@/hooks/useComments';
import { useVideos } from '@/hooks/useVideos';
import { CheckCircle, MessageCircle, ShoppingBag, Sparkles, ArrowLeft } from 'lucide-react';

export default function VideoDetailPage() {
  const params = useParams<{ videoId: string }>();
  const router = useRouter();
  const videoId = params?.videoId;
  const { video, products, recommendations, isLoading, error } = useVideo(videoId || '');
  const { creator, isLoading: isLoadingCreator } = useCreator(video?.creator?.id || '');
  const { comments, totalComments, isLoading: isCommentsLoading } = useComments(videoId || '', { limit: 3 });
  const { data, isLoading: isFeedLoading } = useVideos({ limit: 8 });
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    const title = video?.title ? `${video.title} | Video Shop` : 'Video Shop';
    document.title = title;
  }, [videoId, video?.title]);

  const feedVideos = useMemo(() => data?.pages?.flatMap((page: any) => page.data) || [], [data]);
  const previewComments = useMemo(() => {
    if (!comments || comments.length === 0) {
      return [
        { id: 'preview-1', content: 'Love this shopping flow and the product experience.', user: { name: 'Mina' } },
        { id: 'preview-2', content: 'The creator makes it feel effortless to discover products.', user: { name: 'Dion' } },
        { id: 'preview-3', content: 'Would love to see more bundles like this.', user: { name: 'Lia' } },
      ];
    }

    return comments.slice(0, 3).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      user: comment.user,
    }));
  }, [comments]);

  const handleVideoSelect = (nextVideoId: string) => {
    if (!nextVideoId || nextVideoId === videoId) return;
    router.replace(`/videos/${nextVideoId}`);
  };

  if (isLoading || isFeedLoading || isCommentsLoading || isLoadingCreator) {
    return <VideoDetailSkeleton onBack={() => router.back()} />;
  }

  if (error || !video) {
    return (
      <EmptyState
        iconName="film"
        title="Video not found"
        description="The video you are looking for is unavailable or was removed."
        action={{ label: 'Go Back', onClick: () => router.back() }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] px-4 py-6 text-white lg:px-6 xl:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <BackButton onClick={() => router.back()} />
            <div className="rounded-full border border-white/10 bg-[#111114]/80 px-3 py-1 text-xs text-[#A3A3A3]">
              Shareable video URL
            </div>
          </div>

          <VideoContainer
            video={video}
            autoPlay
            showFloatingActions={!showComments}
            onProgress={() => {}}
          >
            <div className="rounded-[28px] border border-white/10 bg-[#111114]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-xl font-bold text-white">{video.title}</h1>
                    {video.description && <p className="mt-2 text-sm leading-6 text-[#A3A3A3]">{video.description}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#151515]/80 p-3 text-sm text-[#A3A3A3]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#FF3B5C]" />
                      <span>Premium social commerce experience</span>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <span>Live shopping ready</span>
                  </div>

                  {video.creator && (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#151515]/80 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] font-bold text-white">
                        {video.creator.name?.[0] || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-white">{video.creator.name}</p>
                          {video.creator.isVerified && <CheckCircle className="h-3.5 w-3.5 text-[#6366F1]" />}
                        </div>
                        <p className="text-xs text-[#A3A3A3]">{(video.creator.followers ?? 0).toLocaleString()} followers</p>
                      </div>
                      <FollowButton creatorId={video.creator.id} isFollowing={false} onToggle={() => {}} size="sm" />
                    </div>
                  )}

                  <div className="hidden md:block">
                    <VideoActions video={video} variant="inline" onCommentClick={() => setShowComments((value) => !value)} />
                  </div>
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
                      No products are linked to this video yet.
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#151515]/80 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-[#6366F1]" />
                      <h3 className="text-sm font-semibold text-white">Comment preview</h3>
                    </div>
                    <button onClick={() => setShowComments((value) => !value)} className="text-sm text-[#A3A3A3] hover:text-white">
                      {showComments ? 'Hide' : 'View all'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {previewComments.map((comment: any) => (
                      <div key={comment.id} className="rounded-2xl border border-white/10 bg-[#0F0F12] px-3 py-2 text-sm text-[#A3A3A3]">
                        <p className="font-medium text-white">{comment.user?.name || 'Viewer'}</p>
                        <p>{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <CommentsSection
                  videoId={video.id}
                  showComments={showComments}
                  onToggle={() => setShowComments((value) => !value)}
                  commentCount={video.comments || 0}
                />

                {recommendations && recommendations.length > 0 && (
                  <RecommendationsSection recommendations={recommendations} onVideoSelect={handleVideoSelect} />
                )}
              </div>
            </div>
          </VideoContainer>
        </div>

        <aside className="w-full lg:w-[320px]">
          <div className="rounded-[24px] border border-white/10 bg-[#111114]/85 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">More videos</h3>
              <span className="text-xs text-[#A3A3A3]">{feedVideos.length} available</span>
            </div>
            <div className="space-y-2">
              {feedVideos.slice(0, 6).map((item: any) => (
                <button key={item.id} onClick={() => handleVideoSelect(item.id)} className="w-full rounded-2xl border border-white/10 bg-[#151515]/80 p-2 text-left transition hover:border-[#FF3B5C]/30">
                  <div className="flex gap-3">
                    <div className="relative h-[88px] w-[132px] overflow-hidden rounded-xl bg-[#0B0B0D]">
                      <img src={item.thumbnailUrl || '/images/placeholder.png'} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-[#A3A3A3]">{item.creator?.name || 'Creator'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CommentsSection({ videoId, showComments, onToggle, commentCount }: { videoId: string; showComments: boolean; onToggle: () => void; commentCount: number }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#111114]/85 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
      <button onClick={onToggle} className="flex items-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors">
        <span>{showComments ? 'Hide' : 'View'} comments</span>
        <span className="text-xs bg-[#1C1C1C] px-2 py-0.5 rounded-full">{commentCount}</span>
      </button>
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mt-4 overflow-hidden">
            <VideoComments videoId={videoId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecommendationsSection({ recommendations, onVideoSelect }: { recommendations: any[]; onVideoSelect: (id: string) => void }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#111114]/85 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
      <h3 className="text-sm font-semibold text-white mb-3">More videos</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {recommendations.slice(0, 6).map((rec) => (
          <button key={rec.id} onClick={() => onVideoSelect(rec.id)} className="text-left">
            <div className="rounded-2xl border border-white/10 bg-[#151515]/80 p-2">
              <div className="relative mb-2 aspect-[9/16] overflow-hidden rounded-xl bg-[#0B0B0D]">
                <img src={rec.thumbnailUrl || '/images/placeholder.png'} alt={rec.title} className="h-full w-full object-cover" />
              </div>
              <p className="line-clamp-2 text-sm font-medium text-white">{rec.title}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function VideoDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0B0B0D] px-4 py-6 text-white lg:px-6 xl:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#A3A3A3]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="aspect-[9/16] rounded-[24px] bg-[#151515] animate-pulse" />
          <div className="h-20 rounded-[24px] bg-[#151515] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
