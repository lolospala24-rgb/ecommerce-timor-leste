'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { playRealtimeNotificationSound } from '@/lib/notificationSound';

export const useOrderRealtime = (orderId?: number) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    // Room membership for the caller's own user/admin room is derived
    // server-side from the authenticated session on connect. A specific
    // orderId still needs an explicit join — authorized server-side against
    // the session (admins may join any order; customers/sellers only their
    // own) rather than trusted from this payload.
    if (orderId) {
      socket.emit('join-order-room', { orderId });
    }

    const onOrderUpdated = (payload: any) => {
      const statusLabel = payload?.status ? payload.status.replace(/_/g, ' ') : 'updated';
      void playRealtimeNotificationSound();

      queryClient.setQueriesData({ queryKey: ['orders'] }, (oldData: any) => {
        if (!oldData) return oldData;

        if (Array.isArray(oldData)) {
          return oldData.map((item: any) => {
            if (item?.id === payload.orderId) {
              return { ...item, status: payload.status, ...payload };
            }
            return item;
          });
        }

        if (oldData?.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              data: Array.isArray(page?.data)
                ? page.data.map((item: any) => (item?.id === payload.orderId ? { ...item, status: payload.status, ...payload } : item))
                : page?.data,
            })),
          };
        }

        if (oldData?.data && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map((item: any) => (item?.id === payload.orderId ? { ...item, status: payload.status, ...payload } : item)),
          };
        }

        return oldData;
      });

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', payload.orderId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (payload?.status && payload?.orderNumber) {
        toast.success(`Order ${payload.orderNumber} status changed to ${statusLabel}`);
      }
    };

const createOrderRecord = (payload: any) => ({
        id: payload.orderId,
        orderNumber: payload.orderNumber,
        customer: { name: payload.customerName, email: payload.customerEmail },
        seller: { storeName: payload.sellerName },
        total: payload.total,
        status: payload.status,
        paymentMethod: payload.paymentMethod,
        createdAt: payload.createdAt,
        isNew: true,
      });

      const onNewOrderCreated = (payload: any) => {
        void playRealtimeNotificationSound();
        queryClient.setQueriesData({ queryKey: ['orders'] }, (oldData: any) => {
          if (!oldData) return oldData;

          if (Array.isArray(oldData)) {
            const newOrder = createOrderRecord(payload);
            return [newOrder, ...oldData.filter((item: any) => item?.id !== payload.orderId)];
          }

          if (oldData?.pages) {
            const firstPage = oldData.pages[0] || {};
            const firstPageData = Array.isArray(firstPage.data)
              ? [createOrderRecord(payload), ...firstPage.data.filter((item: any) => item?.id !== payload.orderId)]
              : [createOrderRecord(payload)];

            return {
              ...oldData,
              pages: [
                {
                  ...firstPage,
                  data: firstPageData,
                },
                ...oldData.pages.slice(1),
              ],
            };
          }

          if (oldData?.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: [createOrderRecord(payload), ...oldData.data.filter((item: any) => item?.id !== payload.orderId)],
            };
          }

          return oldData;
        });

        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        toast.success(`New order received: ${payload.orderNumber}`);
      };

    socket.on('order-updated', onOrderUpdated);
    socket.on('admin.new_order', onNewOrderCreated);

    return () => {
      socket.off('order-updated', onOrderUpdated);
      socket.off('admin.new_order', onNewOrderCreated);
    };
  }, [orderId, queryClient, user?.id]);
};
