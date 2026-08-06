'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { playRealtimeNotificationSound } from '@/lib/notificationSound';

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications', { params: { page: 1, limit: 20 } });
        return response?.data?.data || response?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60, // 1 minute
  });

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    socket.emit('join-notifications-room', { userId: user.id });

    const onNotificationUpdated = (payload: any) => {
      if (payload?.notification?.userId && payload.notification.userId !== user.id) return;
      void playRealtimeNotificationSound();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    socket.on('notifications:updated', onNotificationUpdated);
    socket.on('admin.new_order', onNotificationUpdated);

    return () => {
      socket.off('notifications:updated', onNotificationUpdated);
      socket.off('admin.new_order', onNotificationUpdated);
    };
  }, [queryClient, user?.id]);

  const notifications = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter((n: { isRead?: boolean }) => !n.isRead).length;

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // noop
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // noop
    }
  };

  return {
    data: notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
