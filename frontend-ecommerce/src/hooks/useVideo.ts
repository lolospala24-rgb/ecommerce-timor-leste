import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videoService } from '@/services/video.service';
import { productService } from '@/services/product.service';
import { Video } from '@/types/video';

export const useVideo = (id: string) => {
  const queryClient = useQueryClient();

  const {
    data: video,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoService.getVideoById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: products,
    isLoading: isLoadingProducts,
  } = useQuery({
    queryKey: ['video-products', id],
    queryFn: () => videoService.getVideoProducts(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: recommendations,
    isLoading: isLoadingRecommendations,
  } = useQuery({
    queryKey: ['video-recommendations', id],
    queryFn: () => videoService.getRecommendations(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const likeMutation = useMutation({
    mutationFn: () => videoService.likeVideo(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['video', id] });
      const previousVideo = queryClient.getQueryData<Video>(['video', id]);
      if (previousVideo) {
        queryClient.setQueryData<Video>(['video', id], {
          ...previousVideo,
          likes: previousVideo.likes + 1,
          isLiked: true,
        });
      }
      return { previousVideo };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => videoService.unlikeVideo(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['video', id] });
      const previousVideo = queryClient.getQueryData<Video>(['video', id]);
      if (previousVideo) {
        queryClient.setQueryData<Video>(['video', id], {
          ...previousVideo,
          likes: previousVideo.likes - 1,
          isLiked: false,
        });
      }
      return { previousVideo };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => productService.addToCart(productId),
  });

  const toggleLike = () => {
    if (video?.isLiked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  return {
    video,
    products,
    recommendations,
    isLoading,
    isLoadingProducts,
    isLoadingRecommendations,
    error,
    toggleLike,
    isLiking: likeMutation.isPending || unlikeMutation.isPending,
    addToCart: addToCartMutation.mutate,
    isAddingToCart: addToCartMutation.isPending,
  };
};