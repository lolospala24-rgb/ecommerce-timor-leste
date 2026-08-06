'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/lib/socket';

export const useOrderRealtime = (orderId?: number) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    socket.emit('join-order-room', { orderId, userId: user.id });

    const onOrderUpdated = (payload: any) => {
      queryClient.setQueryData(['orders', orderId], (current: any) => {
        if (!current) {
          return payload;
        }

        return {
          ...current,
          ...(payload && typeof payload === 'object' ? payload : {}),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['orders', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    socket.on('order-updated', onOrderUpdated);

    return () => {
      socket.off('order-updated', onOrderUpdated);
    };
  }, [orderId, queryClient, user?.id]);
};
