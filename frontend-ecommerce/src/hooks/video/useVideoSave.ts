import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { videoService } from '@/services/video.service';
import { useAuthStore } from '@/stores/authStore';
import { Video } from '@/types/video';
import { patchVideoInCaches } from './useVideoCache';

export function useVideoSave(video: Video) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const mutation = useMutation({
    mutationFn: () => (video.isSaved ? videoService.unsave(video.id) : videoService.save(video.id)),
    onMutate: () => {
      const nextSaved = !video.isSaved;
      const nextSaves = Math.max(0, video.savesCount + (nextSaved ? 1 : -1));
      patchVideoInCaches(queryClient, video.id, { isSaved: nextSaved, savesCount: nextSaves });
      return { previousSaved: video.isSaved, previousSaves: video.savesCount };
    },
    onError: (_error, _vars, context) => {
      if (context) {
        patchVideoInCaches(queryClient, video.id, {
          isSaved: context.previousSaved,
          savesCount: context.previousSaves,
        });
      }
      toast.error("Couldn't update saved videos. Please try again.");
    },
    onSuccess: (result) => {
      patchVideoInCaches(queryClient, video.id, { isSaved: result.saved, savesCount: result.saves });
      queryClient.invalidateQueries({ queryKey: ['videos', 'saved'] });
      toast.success(result.saved ? 'Saved to your videos' : 'Removed from saved videos');
    },
  });

  const toggleSave = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to save videos');
      return;
    }
    mutation.mutate();
  };

  return { toggleSave, isToggling: mutation.isPending };
}
