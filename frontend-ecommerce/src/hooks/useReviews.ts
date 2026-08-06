'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface ReviewFilters {
  page?: number
  limit?: number
}

interface CreateReviewPayload {
  productId: number
  rating: number
  comment: string
}

export const useProductReviews = (productId: number, filters?: ReviewFilters) => {
  return useQuery({
    queryKey: ['reviews', 'product', productId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const response = await api.get(
        `/reviews/product/${productId}${params.toString() ? `?${params.toString()}` : ''}`
      )
      return response.data
    },
    enabled: !!productId,
  })
}

export const useUserReviews = (filters?: ReviewFilters) => {
  return useQuery({
    queryKey: ['reviews', 'user', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const response = await api.get(
        `/reviews/my-reviews${params.toString() ? `?${params.toString()}` : ''}`
      )
      return response.data
    },
  })
}

export const useCreateReview = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const response = await api.post('/reviews', payload)
      return response.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'product', variables.productId] })
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user'] })
      toast.success('Review submitted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit review')
    },
  })
}
