'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import type { AppNotification } from '@/types/notification.types';

interface NotificationsUpdatedPayload {
  type: 'updated';
  notification: AppNotification;
  unreadCount: number;
}

// Keeps the notification bell live instead of waiting up to 30s for the
// next poll (see useNotifications.ts's refetchInterval) — the backend
// gateway auto-joins `user:{userId}` on connect from the verified session
// cookie, so no room-join call is needed here, seller or otherwise.
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();

    const onNotificationsUpdated = (payload: NotificationsUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

      const n = payload?.notification;
      if (n && !n.isRead) {
        toast(n.title, {
          icon: n.priority === 'CRITICAL' || n.priority === 'WARNING' ? '⚠️' : '🔔',
        });
      }
    };

    socket.on('notifications:updated', onNotificationsUpdated);

    return () => {
      socket.off('notifications:updated', onNotificationsUpdated);
    };
  }, [queryClient, userId]);
}
