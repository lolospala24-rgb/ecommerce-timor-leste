'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardStats, RevenueChartData, TopProduct } from '@/types/dashboard.types';

interface DashboardResponse {
  overview: {
    users: { total: number; newToday: number; newThisWeek: number; newThisMonth: number; active: number };
    sellers: { total: number; verified: number; pending: number; newThisMonth: number; verificationRate: number };
    products: { total: number; active: number; outOfStock: number; lowStock: number; activeRate: number };
    orders: { total: number; pending: number; processing: number; shipping: number; delivered: number; cancelled: number; revenue: number };
    payments: { pending: number };
    reviews: { total: number; pending: number; averageRating: number };
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customer: { name: string; email: string };
    seller: { storeName: string };
    total: number;
    status: string;
    createdAt: string;
  }>;
  timestamp: string;
  adminName?: string;
}

interface RevenueResponse {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  data: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
}

export const useDashboard = (period: 'day' | 'week' | 'month' | 'year' = 'month') => {
  return useQuery({
    queryKey: ['dashboard', 'admin', period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      
      const response = await api.get<DashboardResponse>(`/dashboard/admin?${params.toString()}`);
      const data = response.data || response;
      
      return {
        overview: data.overview,
        recentOrders: data.recentOrders || [],
        timestamp: data.timestamp || new Date().toISOString(),
        adminName: data.adminName || 'Admin',
        stats: data.overview,
        revenueData: {
          period: period,
          totalRevenue: data.overview?.orders?.revenue || 0,
          totalOrders: data.overview?.orders?.total || 0,
          data: [],
        },
        topProducts: [],
        salesByRegion: [],
      };
    },
    retry: 2,
    staleTime: 60000, // 1 minute
  });
};

export const useRevenueChart = (period: 'day' | 'week' | 'month' | 'year' = 'month') => {
  return useQuery({
    queryKey: ['dashboard', 'revenue', period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      
      const response = await api.get<RevenueResponse>(`/dashboard/admin/revenue?${params.toString()}`);
      const data = response.data || response;
      
      // Ensure data.data is an array
      const chartData = Array.isArray(data?.data) ? data.data : [];
      
      return {
        period: data?.period || period,
        totalRevenue: data?.totalRevenue || 0,
        totalOrders: data?.totalOrders || 0,
        data: chartData,
      };
    },
    retry: 2,
    staleTime: 60000, // 1 minute
  });
};

export const useTopProducts = (limit: number = 5, period?: 'week' | 'month' | 'year') => {
  return useQuery({
    queryKey: ['dashboard', 'top-products', limit, period],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (period) params.append('period', period);
      
      const response = await api.get(`/dashboard/admin/top-products?${params.toString()}`);
      const data = response.data || response;
      return Array.isArray(data) ? data : [];
    },
    retry: 2,
    staleTime: 60000,
  });
};

export const useTopSellers = (limit: number = 5) => {
  return useQuery({
    queryKey: ['dashboard', 'top-sellers', limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      const response = await api.get(`/dashboard/admin/top-sellers?${params.toString()}`);
      const data = response.data || response;
      return Array.isArray(data) ? data : [];
    },
    retry: 2,
    staleTime: 60000,
  });
};

export const useRecentActivity = (limit: number = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity', limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      const response = await api.get(`/dashboard/admin/recent-activity?${params.toString()}`);
      const data = response.data || response;
      return Array.isArray(data) ? data : [];
    },
    retry: 2,
    staleTime: 60000,
  });
};

export const useSellerDashboard = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['dashboard', 'seller', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/dashboard/seller?${params.toString()}`);
      return response.data || response;
    },
    retry: 2,
    staleTime: 60000,
  });
};

export const useSellerSales = (period: 'day' | 'week' | 'month' | 'year' = 'month') => {
  return useQuery({
    queryKey: ['dashboard', 'seller-sales', period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      
      const response = await api.get(`/dashboard/seller/sales?${params.toString()}`);
      return response.data || response;
    },
    retry: 2,
    staleTime: 60000,
  });
};

export const useCustomerDashboard = () => {
  return useQuery({
    queryKey: ['dashboard', 'customer'],
    queryFn: async () => {
      const response = await api.get('/dashboard/customer');
      return response.data || response;
    },
    retry: 2,
    staleTime: 60000,
  });
};

export const usePublicStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'public-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/public/stats');
      return response.data || response;
    },
    retry: 2,
    staleTime: 300000, // 5 minutes
  });
};