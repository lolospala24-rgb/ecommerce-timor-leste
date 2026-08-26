'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';
import { playRealtimeNotificationSound } from '@/lib/notificationSound';

export interface CustomerNotification {
  id: string;
  orderId: number;
  orderNumber: string;
  status: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  trackingNumber?: string | null;
  note?: string | null;
  // Only present on PRODUCT_BACK_IN_STOCK notifications (see
  // NotificationsService.sendProductBackInStockNotification) — everything
  // else here assumes an order notification, this is the one exception.
  productId?: number | null;
  productSlug?: string | null;
}

const formatStatusLabel = (status?: string) => {
  if (!status) return 'Updated';

  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildNotificationMessage = (payload: any) => {
  const statusLabel = formatStatusLabel(payload?.status);
  const details: string[] = [`Your order ${payload?.orderNumber || '#'+payload?.orderId} status changed to ${statusLabel}.`];

  if (payload?.status === 'SHIPPING') {
    if (payload?.trackingNumber) {
      details.push(`Tracking number: ${payload.trackingNumber}`);
    }

    if (payload?.note) {
      details.push(`Reason / Notes: ${payload.note}`);
    }
  } else if (payload?.note) {
    details.push(`Reason / Notes: ${payload.note}`);
  }

  return details.join(' ');
};

const getStorageKey = (userId?: number | null) => `customer-notifications:${userId ?? 'guest'}`;

const normalizeNotification = (item: any): CustomerNotification => ({
  id: item.id?.toString() ?? `${item.orderId ?? Date.now()}-${Date.now()}`,
  orderId: item.data?.orderId ?? item.orderId,
  orderNumber: item.data?.orderNumber ?? item.orderNumber ?? `#${item.data?.orderId ?? item.orderId ?? 'N/A'}`,
  status: item.data?.status ?? item.status,
  title: item.title,
  message: item.message,
  createdAt: item.createdAt,
  isRead: Boolean(item.isRead),
  trackingNumber: item.data?.trackingNumber ?? item.trackingNumber ?? null,
  note: item.data?.note ?? item.note ?? item.data?.reason ?? null,
  productId: item.data?.productId ?? null,
  productSlug: item.data?.productSlug ?? null,
});

export const useOrderNotifications = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  const storageKey = useMemo(() => getStorageKey(user?.id), [user?.id]);

  const syncNotifications = useCallback((next: CustomerNotification[]) => {
    setNotifications(next);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CustomerNotification[];
        setNotifications(Array.isArray(parsed) ? parsed : []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.warn('Unable to read customer notifications', error);
      setNotifications([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      return;
    }

    const loadNotifications = async () => {
      try {
        const response = await api.get('/notifications', { params: { page: 1, limit: 50 } });
        const items = Array.isArray(response?.data) ? response.data : response?.data?.data || [];
        const next = (items as any[]).map(normalizeNotification).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(next);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch (error) {
        console.warn('Unable to load notifications from backend', error);
      }
    };

    loadNotifications();

    // Own room membership (order updates + notifications) is derived
    // server-side from the authenticated session on connect — no join
    // needed here.
    const socket = getSocket();

    const onOrderUpdated = (payload: any) => {
      if (payload?.userId != user.id) return;

      void playRealtimeNotificationSound();

      const notification: CustomerNotification = {
        id: `${payload?.orderId || Date.now()}-${Date.now()}`,
        orderId: payload?.orderId,
        orderNumber: payload?.orderNumber || `#${payload?.orderId || 'N/A'}`,
        status: payload?.status,
        title: `Order ${payload?.orderNumber || `#${payload?.orderId || 'N/A'}`} updated`,
        message: buildNotificationMessage(payload),
        createdAt: payload?.updatedAt || new Date().toISOString(),
        isRead: false,
        trackingNumber: payload?.trackingNumber ?? null,
        note: payload?.note ?? null,
      };

      setNotifications((prev) => {
        const next = [notification, ...prev]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 50);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }

        return next;
      });
    };

    const onNotificationsUpdated = (payload: any) => {
      if (payload?.notification?.userId && payload.notification.userId !== user.id) return;

      if (payload?.type === 'created' && payload.notification) {
        void playRealtimeNotificationSound();
        const nextNotification = normalizeNotification(payload.notification);
        setNotifications((prev) => {
          const next = [nextNotification, ...prev]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 50);

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
          }

          return next;
        });
        return;
      }

      if (payload?.type === 'updated') {
        setNotifications((prev) => {
          const next = prev.map((item) => {
            if (payload.notification && item.id === `${payload.notification.id}`) {
              return { ...item, ...normalizeNotification(payload.notification) };
            }
            return item;
          });

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
          }

          return next;
        });
      }
    };

    socket.on('order-updated', onOrderUpdated);
    socket.on('notifications:updated', onNotificationsUpdated);

    return () => {
      socket.off('order-updated', onOrderUpdated);
      socket.off('notifications:updated', onNotificationsUpdated);
    };
  }, [isAuthenticated, storageKey, user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.id) return;

    try {
      const notificationId = Number(id);
      if (!Number.isFinite(notificationId)) {
        throw new Error('Invalid notification id');
      }
      await api.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.warn('Unable to mark notification as read', error);
    }

    setNotifications((prev) => {
      const next = prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification,
      );

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }

      return next;
    });
  }, [storageKey, user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await api.patch('/notifications/read-all');
    } catch (error) {
      console.warn('Unable to mark all notifications as read', error);
    }

    setNotifications((prev) => {
      const next = prev.map((notification) => ({ ...notification, isRead: true }));

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }

      return next;
    });
  }, [storageKey, user?.id]);

  const clearNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      await api.delete('/notifications/clear/all');
    } catch (error) {
      console.warn('Unable to clear notifications', error);
    }

    syncNotifications([]);
  }, [syncNotifications, user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  // Sort a copy — notifications is React state; sorting in place would
  // mutate it outside setState and re-sort on every render.
  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications],
  );

  return {
    notifications: sortedNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
};
