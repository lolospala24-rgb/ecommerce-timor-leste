'use client';

import { useQuery } from '@tanstack/react-query';
import { commentService } from '@/services/comment.service';
import { Comment } from '@/types/comment';

export function useComments(videoId?: string) {
  return useQuery<Comment[], Error>({
    queryKey: ['video-comments', videoId],
    queryFn: () => commentService.getComments(videoId as string).then((res) => res.data),
    enabled: !!videoId,
  });
}
