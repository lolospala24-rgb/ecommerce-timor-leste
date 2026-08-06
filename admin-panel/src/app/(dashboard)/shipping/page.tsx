'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, RefreshCw, Search, CheckCircle2, Clock3 } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface ShipmentItem {
  id: string;
  orderRecordId: number;
  orderId: string;
  customerName: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  lastUpdate: string;
  location: string;
  trackingNumber?: string | null;
  rawStatus?: string;
  timeline?: Array<{ status: string; description: string; date?: string; completed?: boolean }>;
}

const normalizeShipmentStatus = (status?: string): ShipmentItem['status'] => {
  switch (status) {
    case 'SHIPPING':
    case 'PROCESSING':
    case 'IN_TRANSIT':
      return 'IN_TRANSIT';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'FAILED':
    case 'CANCELLED':
      return 'FAILED';
    default:
      return 'PENDING';
  }
};

export default function ShippingPage() {
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingDetails, setTrackingDetails] = useState<Record<string, any>>({});
  const [trackingLoadingId, setTrackingLoadingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const response: any = await api.get('/orders/shipping');
      const payload = response?.data?.data || response?.data || [];
      const orders = Array.isArray(payload) ? payload : [];

      const mapped = orders
        .filter((order: any) => order?.rawStatus || order?.status)
        .map((order: any) => ({
          id: `${order.id ?? order.orderRecordId ?? order.orderNumber ?? Math.random()}`,
          orderRecordId: Number(order.id ?? order.orderRecordId ?? 0),
          orderId: order.orderNumber ?? order.id ?? order.orderRecordId ?? 'N/A',
          customerName: order.customerName ?? order.customer?.name ?? order.user?.name ?? 'Unknown',
          status: normalizeShipmentStatus(order.status ?? order.rawStatus) as ShipmentItem['status'],
          lastUpdate: order.lastUpdate ?? (order.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'No update'),
          location: order.location ?? order.address?.city ?? order.shippingAddress?.city ?? 'Unknown',
          trackingNumber: order.trackingNumber ?? null,
          rawStatus: order.rawStatus ?? order.status,
          timeline: order.timeline ?? [],
        }))
        .filter((shipment, index, self) => index === self.findIndex((item) => item.orderRecordId === shipment.orderRecordId));

      setShipments(mapped);
    } catch (error) {
      console.error('Failed to fetch shipments', error);
      toast.error('Unable to load shipping data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    socket.emit('join-order-room', { userId: user.id });

    const handleOrderUpdated = (payload: any) => {
      setShipments((prev) =>
        prev.map((shipment) => {
          if (shipment.orderRecordId !== Number(payload.orderId)) {
            return shipment;
          }

          return {
            ...shipment,
            rawStatus: payload.status ?? shipment.rawStatus,
            status: normalizeShipmentStatus(payload.status) as ShipmentItem['status'],
            lastUpdate: payload.updatedAt ? new Date(payload.updatedAt).toLocaleString() : shipment.lastUpdate,
            trackingNumber: payload.trackingNumber ?? shipment.trackingNumber,
          };
        }),
      );
    };

    const handleNewOrderCreated = (payload: any) => {
      const newShipment: ShipmentItem = {
        id: `${payload.orderId}`,
        orderRecordId: Number(payload.orderId),
        orderId: payload.orderNumber ?? `${payload.orderId}`,
        customerName: payload.customerName ?? 'Unknown',
        status: normalizeShipmentStatus(payload.status),
        lastUpdate: payload.createdAt ? new Date(payload.createdAt).toLocaleString() : 'Just now',
        location: 'Pending assignment',
        trackingNumber: payload.trackingNumber ?? null,
        rawStatus: payload.status,
        timeline: [],
      };

      setShipments((prev) => {
        if (prev.some((shipment) => shipment.orderRecordId === newShipment.orderRecordId)) {
          return prev;
        }

        return [newShipment, ...prev];
      });
    };

    socket.on('order-updated', handleOrderUpdated);
    socket.on('order.created', handleNewOrderCreated);
    socket.on('admin.new_order', handleNewOrderCreated);

    return () => {
      socket.off('order-updated', handleOrderUpdated);
      socket.off('order.created', handleNewOrderCreated);
      socket.off('admin.new_order', handleNewOrderCreated);
    };
  }, [user?.id]);

  const filteredShipments = useMemo(() => {
    const query = search.toLowerCase();
    return shipments.filter((shipment) => {
      return [shipment.orderId, shipment.customerName, shipment.location, shipment.status, shipment.rawStatus]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [shipments, search]);

  const stats = useMemo(() => ({
    active: shipments.filter((item) => item.status === 'IN_TRANSIT').length,
    delivered: shipments.filter((item) => item.status === 'DELIVERED').length,
    pending: shipments.filter((item) => item.status === 'PENDING').length,
  }), [shipments]);

  const handleTrackShipment = async (shipment: ShipmentItem) => {
    if (!shipment.trackingNumber) {
      setTrackingDetails((prev) => ({ ...prev, [shipment.id]: null }));
      toast.error('No tracking number available for this shipment');
      return;
    }

    setTrackingLoadingId(shipment.id);
    try {
      const response: any = await api.get(`/orders/tracking/${shipment.trackingNumber}`);
      const payload = response?.data?.data || response?.data || response;
      setTrackingDetails((prev) => ({ ...prev, [shipment.id]: payload }));
    } catch (error) {
      console.error('Failed to fetch tracking details', error);
      toast.error('Unable to load tracking details');
    } finally {
      setTrackingLoadingId(null);
    }
  };

  const handleAdvanceShipping = async (shipment: ShipmentItem) => {
    if (!shipment.orderRecordId) {
      toast.error('Order reference is missing');
      return;
    }

    const currentStatus = shipment.rawStatus ?? 'PENDING';

    if (currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED') {
      toast.error(`Order is already ${currentStatus.toLowerCase()}`);
      return;
    }

    const targetStatus = currentStatus === 'SHIPPING' ? 'DELIVERED' : 'SHIPPING';
    const allowedStatuses: Record<string, string[]> = {
      PENDING: ['SHIPPING'],
      PAID: ['SHIPPING'],
      PROCESSING: ['SHIPPING'],
      SHIPPING: ['DELIVERED'],
    };

    if (!allowedStatuses[currentStatus]?.includes(targetStatus)) {
      toast.error(`Cannot change status from ${currentStatus} to ${targetStatus}`);
      return;
    }

    setActionLoadingId(shipment.id);
    try {
      await api.patch(`/orders/${shipment.orderRecordId}/status`, {
        status: targetStatus,
        trackingNumber: shipment.trackingNumber ?? undefined,
      });
      toast.success(targetStatus === 'DELIVERED' ? 'Shipment marked as delivered' : 'Shipment started successfully');
      await fetchShipments();
    } catch (error: any) {
      console.error('Failed to update shipment', error);
      toast.error(error.response?.data?.message || 'Failed to update shipment status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getActionButtonMeta = (shipment: ShipmentItem) => {
    const currentStatus = shipment.rawStatus ?? 'PENDING';

    if (currentStatus === 'DELIVERED') {
      return { label: 'Delivered', disabled: true, variant: 'secondary' as const };
    }

    if (currentStatus === 'CANCELLED') {
      return { label: 'Cancelled', disabled: true, variant: 'secondary' as const };
    }

    if (currentStatus === 'SHIPPING') {
      return { label: 'Mark Delivered', disabled: false, variant: 'default' as const };
    }

    return { label: 'Start Shipping', disabled: false, variant: 'secondary' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping & Logistics</h1>
          <p className="text-muted-foreground">Track and manage shipment progress for active orders.</p>
        </div>
        <Button variant="outline" onClick={() => fetchShipments()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipment Overview
          </CardTitle>
          <CardDescription>Recent shipment activity based on current orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shipment or customer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading shipments...</div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No shipments found.</div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment) => (
                <div key={shipment.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{shipment.orderId}</span>
                        <Badge variant="secondary">{shipment.customerName}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{shipment.location}</div>
                      {shipment.trackingNumber && (
                        <div className="text-sm text-muted-foreground">Tracking: {shipment.trackingNumber}</div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {shipment.status === 'DELIVERED' ? (
                        <Badge className="bg-green-600 text-white"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Delivered</Badge>
                      ) : shipment.status === 'IN_TRANSIT' ? (
                        <Badge className="bg-blue-600 text-white"><Truck className="mr-1 h-3.5 w-3.5" />In Transit</Badge>
                      ) : shipment.status === 'FAILED' ? (
                        <Badge className="bg-red-600 text-white"><Clock3 className="mr-1 h-3.5 w-3.5" />Failed</Badge>
                      ) : (
                        <Badge variant="outline"><Clock3 className="mr-1 h-3.5 w-3.5" />Pending</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">{shipment.lastUpdate}</span>
                      <Button variant="outline" size="sm" onClick={() => handleTrackShipment(shipment)} disabled={trackingLoadingId === shipment.id}>
                        {trackingLoadingId === shipment.id ? 'Loading...' : 'Track'}
                      </Button>
                      <Button
                        variant={getActionButtonMeta(shipment).variant}
                        size="sm"
                        onClick={() => handleAdvanceShipping(shipment)}
                        disabled={actionLoadingId === shipment.id || getActionButtonMeta(shipment).disabled}
                      >
                        {actionLoadingId === shipment.id ? 'Updating...' : getActionButtonMeta(shipment).label}
                      </Button>
                    </div>
                  </div>

                  {trackingDetails[shipment.id] && (
                    <div className="mt-4 rounded-md border bg-muted/30 p-3">
                      <div className="text-sm font-medium">Tracking timeline</div>
                      <div className="mt-2 space-y-2">
                        {((trackingDetails[shipment.id]?.timeline ?? shipment.timeline ?? []) as Array<any>).map((step: any, index: number) => (
                          <div key={`${step.status}-${index}`} className="flex items-start gap-2 text-sm">
                            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                            <div>
                              <div className="font-medium">{step.status}</div>
                              <div className="text-muted-foreground">{step.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
