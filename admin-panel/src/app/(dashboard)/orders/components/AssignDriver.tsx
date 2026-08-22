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
import { Loader2, Truck } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useAssignDriver } from '@/hooks/useOrders';

interface AssignDriverProps {
  orderId: number;
  currentDriverId?: number | null;
  currentDriverName?: string | null;
}

// Deliberately its own small dialog rather than folded into
// UpdateOrderStatus — assigning a driver is "who delivers this", entirely
// independent of the OrderStatus lifecycle that dialog manages (see
// OrdersService.assignDriver's doc-comment on the backend).
export function AssignDriver({ orderId, currentDriverId, currentDriverName }: AssignDriverProps) {
  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState<string>(currentDriverId ? String(currentDriverId) : '');

  const { data: driversResponse, isLoading: isLoadingDrivers } = useUsers({ role: 'COURIER', limit: 100 });
  const assignDriver = useAssignDriver();

  const drivers = driversResponse?.data || [];

  const handleSubmit = () => {
    if (!driverId) return;
    assignDriver.mutate(
      { id: orderId, driverId: Number(driverId) },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="mr-2 h-4 w-4" />
          {currentDriverName ? 'Change Driver' : 'Assign Driver'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Delivery Driver</DialogTitle>
          <DialogDescription>
            Pick a courier account to deliver this order. They'll be notified and can share their live location once they start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingDrivers ? 'Loading drivers...' : 'Select a driver'} />
              </SelectTrigger>
              <SelectContent>
                {drivers.length === 0 && !isLoadingDrivers && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No driver accounts found. Create a user with the Courier role first.
                  </div>
                )}
                {drivers.map((driver: any) => (
                  <SelectItem key={driver.id} value={String(driver.id)}>
                    {driver.name} {driver.phone ? `· ${driver.phone}` : ''}
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
          <Button onClick={handleSubmit} disabled={!driverId || assignDriver.isPending}>
            {assignDriver.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
              </>
            ) : (
              'Assign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
