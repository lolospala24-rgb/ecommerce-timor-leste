import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { SellerReview } from '@/types/notification.types';

interface SellerReviewsResponse {
  data: {
    data: SellerReview[];
    pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  };
  sellerRating: number;
  totalSellerReviews: number;
}

export function useSellerReviews(params: { page?: number; limit?: number; status?: 'pending' | 'approved' }) {
  return useQuery({
    queryKey: ['seller-reviews', params],
    queryFn: async () => {
      const res: any = await api.get('/reviews/seller', { params });
      return (res.data ?? res) as SellerReviewsResponse;
    },
  });
}

export function useReplyToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) => {
      const res: any = await api.post(`/reviews/${id}/reply`, { reply });
      return res.data ?? res;
    },
    onSuccess: () => {
      toast.success('Reply posted');
      qc.invalidateQueries({ queryKey: ['seller-reviews'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to post reply');
    },
  });
}
