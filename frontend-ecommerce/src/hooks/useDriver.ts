'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export interface DriverDelivery {
  id: number;
  orderNumber: string;
  status: string;
  shippingStatus: 'PENDING' | 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  trackingNumber: string | null;
  deliveryRecipientName: string | null;
  deliveryPhone: string | null;
  deliveryMunicipality: string | null;
  deliveryPostoAdmin: string | null;
  deliverySuco: string | null;
  deliveryVillage: string | null;
  deliveryStreet: string | null;
  deliveryReference: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  courierLatitude: number | null;
  courierLongitude: number | null;
  courierLocationUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useDriverDeliveries = () => {
  return useQuery({
    queryKey: ['driver', 'deliveries'],
    queryFn: async () => {
      const response = await api.get('/orders/driver/my-deliveries?limit=50');
      const payload = response.data?.data ?? response.data;
      return (payload?.data ?? payload ?? []) as DriverDelivery[];
    },
    // Assignments can arrive at any time — a driver checking their list
    // shouldn't have to manually refresh to see a new delivery.
    refetchInterval: 30_000,
  });
};

export const useUpdateCourierLocation = () => {
  return useMutation({
    mutationFn: async ({ orderId, latitude, longitude }: { orderId: number; latitude: number; longitude: number }) => {
      const response = await api.post(`/orders/${orderId}/courier-location`, { latitude, longitude });
      return response.data;
    },
    // Deliberately silent on both success and error — this fires every few
    // seconds while location sharing is on, and a toast per ping would be
    // unusable noise. Sharing-state UI (see the page component) already
    // tells the driver whether it's working.
  });
};

export const useUpdateShippingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, shippingStatus }: { orderId: number; shippingStatus: DriverDelivery['shippingStatus'] }) => {
      const response = await api.patch(`/orders/${orderId}/shipping-status`, { shippingStatus });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'deliveries'] });
      toast.success(
        variables.shippingStatus === 'DELIVERED'
          ? "Marked as delivered — the customer will be asked to confirm."
          : 'Status updated',
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });
};
