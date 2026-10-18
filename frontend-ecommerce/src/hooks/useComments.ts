import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { commentService } from '@/services/comment.service';
import type { Comment } from '@/types/comment';
import { useAuthStore } from '@/stores/authStore';
import { patchVideoInCaches } from './video/useVideoCache';

const PAGE_SIZE = 20;

export const useComments = (videoId: number | null) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const query = useInfiniteQuery({
    queryKey: ['comments', videoId],
    queryFn: ({ pageParam = 1 }) => commentService.getComments(videoId as number, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    enabled: videoId != null,
    staleTime: 30 * 1000,
  });

  const comments = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number }) =>
      commentService.createComment(videoId as number, content, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
      if (videoId != null) {
        patchVideoInCaches(queryClient, videoId, (v) => ({ commentsCount: v.commentsCount + 1 }));
      }
    },
    onError: () => toast.error("Couldn't post your comment. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => commentService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
      if (videoId != null) {
        patchVideoInCaches(queryClient, videoId, (v) => ({ commentsCount: Math.max(0, v.commentsCount - 1) }));
      }
    },
    onError: () => toast.error("Couldn't delete comment. Please try again."),
  });

  // Toggles like/unlike — unlike VideoLike (checked via video.isLiked, a
  // single top-level flag), a comment can be nested one level in `replies`,
  // so this walks both when patching the cache.
  const patchCommentLikeState = (commentId: number, liked: boolean, likes: number) => {
    const patch = (c: any): any =>
      c.id === commentId
        ? { ...c, isLiked: liked, likes }
        : { ...c, replies: Array.isArray(c.replies) ? c.replies.map(patch) : c.replies };

    queryClient.setQueryData(['comments', videoId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          items: page.items.map(patch),
        })),
      };
    });
  };

  const likeMutation = useMutation({
    mutationFn: (commentId: number) => commentService.likeComment(commentId),
    onSuccess: (result, commentId) => patchCommentLikeState(commentId, result.liked, result.likes),
  });

  const unlikeMutation = useMutation({
    mutationFn: (commentId: number) => commentService.unlikeComment(commentId),
    onSuccess: (result, commentId) => patchCommentLikeState(commentId, result.liked, result.likes),
  });

  const findComment = (commentId: number): Comment | undefined => {
    for (const c of comments) {
      if (c.id === commentId) return c;
      const reply = c.replies.find((r) => r.id === commentId);
      if (reply) return reply;
    }
    return undefined;
  };

  const toggleLikeComment = (commentId: number) => {
    if (!isAuthenticated) {
      toast.error('Please log in to like comments');
      return;
    }
    const comment = findComment(commentId);
    if (comment?.isLiked) {
      unlikeMutation.mutate(commentId);
    } else {
      likeMutation.mutate(commentId);
    }
  };

  const addComment = (content: string, parentId?: number) => {
    if (!isAuthenticated) {
      toast.error('Please log in to comment');
      return;
    }
    if (!content.trim()) return;
    createMutation.mutate({ content: content.trim(), parentId });
  };

  return {
    comments,
    total,
    isLoading: query.isLoading,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    addComment,
    isPosting: createMutation.isPending,
    deleteComment: deleteMutation.mutate,
    likeComment: toggleLikeComment,
  };
};
