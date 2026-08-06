import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '@/services/comment.service';
import { Comment } from '@/types/comment';

interface UseCommentsOptions {
  limit?: number;
  sortBy?: 'recent' | 'popular' | 'oldest';
}

export const useComments = (videoId: string, options: UseCommentsOptions = {}) => {
  const queryClient = useQueryClient();
  const { limit = 10 } = options;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['comments', videoId, options],
    queryFn: ({ pageParam = 1 }) =>
      commentService.getComments(videoId, pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!videoId,
    staleTime: 2 * 60 * 1000,
  });

  const comments = data?.pages.flatMap((page) => page.data) || [];
  const totalComments = data?.pages[0]?.meta.total || 0;

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => commentService.createComment(videoId, content),
    onSuccess: (newComment) => {
      queryClient.setQueryData(['comments', videoId, options], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: [
            {
              ...oldData.pages[0],
              data: [newComment, ...oldData.pages[0].data],
              meta: {
                ...oldData.pages[0].meta,
                total: oldData.pages[0].meta.total + 1,
              },
            },
            ...oldData.pages.slice(1),
          ],
        };
      });
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentService.likeComment(commentId),
    onSuccess: (result, commentId) => {
      queryClient.setQueryData(['comments', videoId, options], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((comment: Comment) =>
              comment.id === commentId
                ? {
                    ...comment,
                    likes: result.likes,
                    isLiked: result.isLiked,
                  }
                : comment
            ),
          })),
        };
      });
    },
  });

  return {
    comments,
    totalComments,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createComment: createCommentMutation.mutate,
    isCreating: createCommentMutation.isPending,
    likeComment: likeCommentMutation.mutate,
    isLiking: likeCommentMutation.isPending,
  };
};