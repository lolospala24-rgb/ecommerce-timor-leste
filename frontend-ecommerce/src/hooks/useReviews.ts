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

interface ReviewEligibility {
  canReview: boolean
  reason?: 'reviews_disabled' | 'already_reviewed' | 'not_purchased'
  message?: string
}

export const useReviewEligibility = (productId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['reviews', 'eligibility', productId],
    queryFn: async () => {
      const response = await api.get(`/reviews/product/${productId}/eligibility`)
      // Controller wraps the result as { data: result }, and the global
      // TransformInterceptor wraps that again as { status, data } — so the
      // real payload is nested one level deeper than a typical response.
      return (response.data?.data ?? response.data) as ReviewEligibility
    },
    enabled: enabled && !!productId,
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
      return response.data.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'product', variables.productId] })
      queryClient.invalidateQueries({ queryKey: ['reviews', 'eligibility', variables.productId] })
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user'] })
      toast.success('Review submitted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit review')
    },
  })
}

interface UpdateReviewPayload {
  id: number
  rating: number
  comment: string
}

// Backend rejects this once the review is already approved (see
// ReviewsService.update) — editable only while still pending.
export const useUpdateReview = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateReviewPayload) => {
      const response = await api.patch(`/reviews/${id}`, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user'] })
      toast.success('Review updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update review')
    },
  })
}

export const useDeleteReview = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/reviews/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user'] })
      toast.success('Review deleted')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete review')
    },
  })
}
