import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { unwrapApiData } from '@/lib/product'

interface SellerFilters {
  page?: number
  limit?: number
  search?: string
  isVerified?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

function mapSellerForDisplay(seller: any) {
  return {
    ...seller,
    ownerName: seller.ownerName ?? seller.user?.name ?? '',
    totalProducts: seller.totalProducts ?? seller._count?.products ?? 0,
    totalRevenue: seller.totalRevenue ?? 0,
  }
}

export function useSellers(filters?: SellerFilters) {
  return useQuery({
    queryKey: ['sellers', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.search) params.append('search', filters.search)

      const response = await api.get(`/sellers/verified?${params.toString()}`)
      const payload = response?.data
      const sellers = Array.isArray(payload) ? payload : payload?.data || []
      const pagination = payload?.pagination || {
        page: filters?.page || 1,
        limit: filters?.limit || sellers.length || 12,
        total: sellers.length || 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }

      return {
        ...response,
        data: sellers.map(mapSellerForDisplay),
        pagination,
      }
    },
  })
}

export function useSeller(id: number) {
  return useQuery({
    queryKey: ['seller', id],
    queryFn: async () => {
      const response = await api.get(`/sellers/${id}`)
      return mapSellerForDisplay(unwrapApiData(response))
    },
    enabled: !!id,
  })
}

export function useTopSellers(limit: number = 6) {
  return useQuery({
    queryKey: ['top-sellers', limit],
    queryFn: async () => {
      const response = await api.get(`/sellers/verified?limit=${limit}`)
      const sellers = response?.data?.data || []
      return sellers.map(mapSellerForDisplay)
    },
  })
}
