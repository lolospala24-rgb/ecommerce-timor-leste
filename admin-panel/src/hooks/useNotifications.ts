'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { playRealtimeNotificationSound } from '@/lib/notificationSound';
import { shouldPlaySound, type AdminNotification } from '@/lib/notifications';

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications', { params: { page: 1, limit: 20 } });
        return (response?.data?.data || response?.data || []) as AdminNotification[];
      } catch {
        return [] as AdminNotification[];
      }
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // The dropdown only fetches the latest 20 rows — deriving "unread" from
  // that page undercounts once unread total exceeds 20, so the real count
  // comes from its own dedicated, unpaginated endpoint.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications/unread/count');
        return Number(response?.data?.data?.count ?? 0);
      } catch {
        return 0;
      }
    },
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!user?.id) return;

    // No join needed — the server derives room membership from the
    // authenticated session (verified JWT cookie) on connect, not from
    // anything the client tells it.
    const socket = getSocket();

    const onNotificationUpdated = (payload: any) => {
      if (payload?.notification?.userId && payload.notification.userId !== user.id) return;
      if (payload?.notification && shouldPlaySound(payload.notification)) {
        void playRealtimeNotificationSound();
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    // `admin.new_order` is intentionally not listened to here — it's an
    // ephemeral, non-persisted order event; the persisted "New Order
    // Received" admin notification arrives through `notifications:updated`
    // like every other notification. Listening to both fired the sound and
    // the query invalidation twice for the same event.
    socket.on('notifications:updated', onNotificationUpdated);

    return () => {
      socket.off('notifications:updated', onNotificationUpdated);
    };
  }, [queryClient, user?.id]);

  const notifications = Array.isArray(data) ? data : [];

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
