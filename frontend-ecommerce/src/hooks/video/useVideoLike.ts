import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { videoService } from '@/services/video.service';
import { useAuthStore } from '@/stores/authStore';
import { Video } from '@/types/video';
import { patchVideoInCaches } from './useVideoCache';

export function useVideoLike(video: Video) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const mutation = useMutation({
    mutationFn: () => (video.isLiked ? videoService.unlike(video.id) : videoService.like(video.id)),
    onMutate: () => {
      const nextLiked = !video.isLiked;
      const nextLikes = Math.max(0, video.likes + (nextLiked ? 1 : -1));
      patchVideoInCaches(queryClient, video.id, { isLiked: nextLiked, likes: nextLikes });
      return { previousLiked: video.isLiked, previousLikes: video.likes };
    },
    onError: (_error, _vars, context) => {
      if (context) {
        patchVideoInCaches(queryClient, video.id, {
          isLiked: context.previousLiked,
          likes: context.previousLikes,
        });
      }
      toast.error("Couldn't update like. Please try again.");
    },
    onSuccess: (result) => {
      patchVideoInCaches(queryClient, video.id, { isLiked: result.liked, likes: result.likes });
    },
  });

  const toggleLike = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to like videos');
      return;
    }
    mutation.mutate();
  };

  // Like-only, never unlike — for the double-tap gesture, which (like
  // TikTok's) always likes regardless of current state and is a no-op if
  // the video is already liked, rather than toggling it off. Returns
  // whether the caller should play the heart-burst animation: false only
  // when logged out (so the login toast is the only feedback, rather than
  // showing a "success" animation for an action that silently did nothing).
  const like = (): boolean => {
    if (!isAuthenticated) {
      toast.error('Please log in to like videos');
      return false;
    }
    if (!video.isLiked && !mutation.isPending) {
      mutation.mutate();
    }
    return true;
  };

  return { toggleLike, like, isToggling: mutation.isPending };
}
