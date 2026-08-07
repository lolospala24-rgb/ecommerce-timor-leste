'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface PendingReview {
  id: number;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  product: {
    id: number;
    name: string;
    seller: {
      storeName: string;
    };
  };
}

interface PendingReviewsResponse {
  data: PendingReview[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const usePendingReviews = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['reviews', 'pending', page, limit],
    queryFn: async () => {
      const response = await api.get<PendingReviewsResponse>(`/reviews/pending?page=${page}&limit=${limit}`);
      return unwrapApiData<PendingReviewsResponse>(response.data);
    },
  });
};

export const useApproveReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/reviews/${id}/approve`);
      return unwrapApiData(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
      toast.success('Review approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve review');
    },
  });
};

export const useRejectReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post(`/reviews/${id}/reject`, { reason });
      return unwrapApiData(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
      toast.success('Review rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject review');
    },
  });
};
