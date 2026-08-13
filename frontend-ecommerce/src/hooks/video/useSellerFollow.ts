import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { sellerFollowService } from '@/services/seller-follow.service';
import { useAuthStore } from '@/stores/authStore';
import { VideoCreator } from '@/types/video';
import { patchVideosBySeller } from './useVideoCache';

export function useSellerFollow(creator: VideoCreator, isFollowing: boolean) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const mutation = useMutation({
    mutationFn: () =>
      isFollowing ? sellerFollowService.unfollow(creator.id) : sellerFollowService.follow(creator.id),
    onMutate: () => {
      const nextFollowing = !isFollowing;
      const nextFollowers = Math.max(0, creator.followersCount + (nextFollowing ? 1 : -1));
      patchVideosBySeller(queryClient, creator.id, (video) => ({
        isFollowingCreator: nextFollowing,
        product: video.product
          ? { ...video.product, seller: video.product.seller ? { ...video.product.seller, followersCount: nextFollowers } : null }
          : video.product,
      }));
      return { previousFollowing: isFollowing, previousFollowers: creator.followersCount };
    },
    onError: (_error, _vars, context) => {
      if (context) {
        patchVideosBySeller(queryClient, creator.id, (video) => ({
          isFollowingCreator: context.previousFollowing,
          product: video.product
            ? {
                ...video.product,
                seller: video.product.seller
                  ? { ...video.product.seller, followersCount: context.previousFollowers }
                  : null,
              }
            : video.product,
        }));
      }
      toast.error("Couldn't update follow status. Please try again.");
    },
    onSuccess: (result) => {
      patchVideosBySeller(queryClient, creator.id, (video) => ({
        isFollowingCreator: result.isFollowing,
        product: video.product
          ? {
              ...video.product,
              seller: video.product.seller
                ? { ...video.product.seller, followersCount: result.followersCount }
                : null,
            }
          : video.product,
      }));
    },
  });

  const toggleFollow = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to follow this seller');
      return;
    }
    mutation.mutate();
  };

  return { toggleFollow, isToggling: mutation.isPending };
}
