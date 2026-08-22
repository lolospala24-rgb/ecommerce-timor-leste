'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck } from 'lucide-react';
import { useUpdateShippingStatus } from '@/hooks/useOrders';

interface UpdateShippingStatusProps {
  orderId: number;
  currentShippingStatus: string;
}

// Mirrors OrdersService.SHIPPING_STATUS_TRANSITIONS on the backend exactly —
// the backend is the real enforcement (this just keeps the dropdown from
// ever offering an option the API would reject anyway). FAILED -> BOOKED
// only really makes sense together with reassigning a driver (see
// AssignDriver, which does this automatically), so it's deliberately left
// out here to avoid implying this alone "retries" the delivery.
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['BOOKED', 'FAILED'],
  BOOKED: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
};

// Admin/seller override for the delivery-stage field — separate from
// UpdateOrderStatus (the financial OrderStatus dialog). Exists for when a
// driver can't or won't update it themselves (unreachable, using an
// external courier that hasn't set up the webhook yet, correcting a
// mistake). Never touches OrderStatus/COD payout — same rule as when a
// driver does it from their own portal.
export function UpdateShippingStatus({ orderId, currentShippingStatus }: UpdateShippingStatusProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const updateShippingStatus = useUpdateShippingStatus();

  const validNext = VALID_TRANSITIONS[currentShippingStatus] || [];

  const handleSubmit = () => {
    if (!status) return;
    updateShippingStatus.mutate(
      { id: orderId, shippingStatus: status },
      { onSuccess: () => { setOpen(false); setStatus(''); } },
    );
  };

  if (validNext.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="mr-2 h-4 w-4" />
          Update Delivery Status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Delivery Status</DialogTitle>
          <DialogDescription>
            This only changes the delivery stage (courier-facing), not the order's payment/financial status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertDescription className="text-sm">
              Current: <strong>{STATUS_LABELS[currentShippingStatus] || currentShippingStatus}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>New Delivery Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {validNext.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABELS[value] || value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!status || updateShippingStatus.isPending}>
            {updateShippingStatus.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
