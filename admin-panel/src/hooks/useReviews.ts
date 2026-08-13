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
  isApproved?: boolean;
  rejectionReason?: string | null;
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
      const response = await api.get(`/reviews/pending?page=${page}&limit=${limit}`);
      // Not unwrapApiData here — this payload is itself { data: Review[], pagination }
      // and unwrapApiData's recursive unwrap would keep descending into that inner
      // `data` array, discarding the `pagination` object entirely. The api client's
      // interceptor already strips axios's own response wrapper, so `response` here
      // is the backend envelope { status, data } — one single access gets us in.
      return (response as unknown as { data: PendingReviewsResponse }).data;
    },
  });
};

export type ReviewStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export const useAdminReviews = (
  status: ReviewStatusFilter,
  search: string,
  page: number = 1,
  limit: number = 20,
) => {
  return useQuery({
    queryKey: ['reviews', 'admin', status, search, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const response = await api.get(`/reviews/admin?${params.toString()}`);
      // See usePendingReviews above — same shape, same reason to avoid unwrapApiData.
      return (response as unknown as { data: PendingReviewsResponse }).data;
    },
    placeholderData: (previous) => previous,
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
      queryClient.invalidateQueries({ queryKey: ['reviews', 'admin'] });
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
      queryClient.invalidateQueries({ queryKey: ['reviews', 'admin'] });
      toast.success('Review rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject review');
    },
  });
};
