'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AdminNotification, NotificationCategory } from '@/lib/notifications';

export type NotificationCategoryFilter = 'all' | NotificationCategory;

interface NotificationsResponse {
  data: AdminNotification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useAdminNotificationsList = (params: {
  page: number;
  limit?: number;
  category: NotificationCategoryFilter;
  unreadOnly: boolean;
}) => {
  const { page, limit = 20, category, unreadOnly } = params;

  return useQuery({
    queryKey: ['notifications', 'list', page, limit, category, unreadOnly],
    queryFn: async () => {
      const response = await api.get('/notifications', {
        params: {
          page,
          limit,
          unreadOnly,
          ...(category !== 'all' ? { category } : {}),
        },
      });
      return (response as unknown as { data: NotificationsResponse }).data;
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
