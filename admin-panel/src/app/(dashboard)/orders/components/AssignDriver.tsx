'use client';

import { useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Check,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useAssignDriver } from '@/hooks/useOrders';
import { cn } from '@/lib/utils';

interface AssignDriverProps {
  orderId: number;
  orderNumber: string;
  deliveryAddress?: string | null;
  currentDriverId?: number | null;
  currentDriverName?: string | null;
}

interface Driver {
  id: number;
  name: string;
  phone: string | null;
  isOnline?: boolean;
  _count?: { assignedDeliveries?: number };
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

function workloadLabel(count: number) {
  if (count === 0) return 'No active deliveries';
  return `${count} active ${count === 1 ? 'delivery' : 'deliveries'}`;
}

function DriverCard({
  driver,
  selected,
  onSelect,
  highlight,
}: {
  driver: Driver;
  selected: boolean;
  onSelect: () => void;
  highlight?: boolean;
}) {
  const activeCount = driver._count?.assignedDeliveries ?? 0;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors duration-150',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : highlight
            ? 'border-amber-200 bg-amber-50/60 hover:border-primary/40 hover:bg-accent dark:border-amber-900/40 dark:bg-amber-950/10'
            : 'border-border hover:border-primary/40 hover:bg-accent',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </span>

      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarFallback>{initials(driver.name)}</AvatarFallback>
      </Avatar>

      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{driver.name}</span>
          {driver.isOnline ? (
            <Badge variant="success" className="shrink-0 gap-1 text-[10px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Online
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0 gap-1 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" /> Offline
            </Badge>
          )}
        </span>
        {driver.phone && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" /> {driver.phone}
          </span>
        )}
        <span className="block text-xs text-muted-foreground">{workloadLabel(activeCount)}</span>
      </span>
    </button>
  );
}

// A production-grade driver picker, not a plain CRUD dropdown — deliberately
// its own dialog rather than folded into UpdateOrderStatus (see that
// component's doc-comment: assigning a driver is "who delivers this",
// independent of the OrderStatus lifecycle).
//
// Scope note: the design this was built against also called for driver
// rating, vehicle/plate info, and distance-to-delivery. None of that exists
// in the backend today (no courier rating source, no vehicle profile
// fields, and courier lat/lng is only ever recorded for an order a driver
// is *already* assigned to — see Order.courierLatitude). Rather than fake
// that data in the UI, this only surfaces what's real: online presence
// (driver app's socket connection — see NotificationsGateway), account
// status, and each driver's current active-delivery workload. Both feed
// the "Recommended" pick: online drivers first, least-loaded among those.
export function AssignDriver({
  orderId,
  orderNumber,
  deliveryAddress,
  currentDriverId,
  currentDriverName,
}: AssignDriverProps) {
  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState<string>(currentDriverId ? String(currentDriverId) : '');
  const [search, setSearch] = useState('');

  const {
    data: driversResponse,
    isLoading: isLoadingDrivers,
    refetch: refetchDrivers,
  } = useUsers({ role: 'COURIER', isActive: true, limit: 100 }, { enabled: open });
  const assignDriver = useAssignDriver();

  const drivers: Driver[] = driversResponse?.data || [];

  const recommended = useMemo(() => {
    if (drivers.length === 0) return null;
    return [...drivers].sort((a, b) => {
      if (Boolean(a.isOnline) !== Boolean(b.isOnline)) return a.isOnline ? -1 : 1;
      return (a._count?.assignedDeliveries ?? 0) - (b._count?.assignedDeliveries ?? 0);
    })[0];
  }, [drivers]);

  const query = search.trim().toLowerCase();
  const filteredDrivers = useMemo(() => {
    if (!query) return drivers;
    return drivers.filter(
      (driver) => driver.name.toLowerCase().includes(query) || driver.phone?.toLowerCase().includes(query),
    );
  }, [drivers, query]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDriverId(currentDriverId ? String(currentDriverId) : '');
      setSearch('');
    }
  };

  const handleSubmit = () => {
    if (!driverId || assignDriver.isPending) return;
    assignDriver.mutate(
      { id: orderId, driverId: Number(driverId) },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="mr-2 h-4 w-4" />
          {currentDriverName ? 'Change Driver' : 'Assign Driver'}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-h-[80vh] sm:w-full sm:max-w-[700px]">
        <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">Assign Driver</DialogTitle>
          <DialogDescription>Choose an available driver for this delivery</DialogDescription>
          <p className="font-mono text-xs text-muted-foreground">Order #{orderNumber}</p>
        </DialogHeader>

        <div className="shrink-0 space-y-4 border-b px-6 py-4">
          <div className="space-y-1.5 rounded-lg border bg-muted/40 px-3.5 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">Order #{orderNumber}</span>
            </div>
            {deliveryAddress && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{deliveryAddress}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>Delivery</span>
            </div>
          </div>

          {!isLoadingDrivers && recommended && !query && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-amber-500" /> Recommended Driver
              </p>
              <DriverCard
                driver={recommended}
                selected={driverId === String(recommended.id)}
                onSelect={() => setDriverId(String(recommended.id))}
                highlight
              />
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver by name or phone..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Available Drivers</p>
            {!isLoadingDrivers && (
              <p className="text-xs text-muted-foreground">
                {filteredDrivers.length} driver{filteredDrivers.length === 1 ? '' : 's'} available
              </p>
            )}
          </div>
        </div>

        <div role="radiogroup" aria-label="Available drivers" className="flex-1 space-y-2 overflow-y-auto px-6 py-3">
          {isLoadingDrivers ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
            ))
          ) : drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Truck className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No available drivers</p>
                <p className="text-sm text-muted-foreground">
                  There are no active courier accounts available for this delivery.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchDrivers()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh Drivers
              </Button>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No drivers found</p>
                <p className="text-sm text-muted-foreground">Try a different name or phone number.</p>
              </div>
            </div>
          ) : (
            filteredDrivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                selected={driverId === String(driver.id)}
                onSelect={() => setDriverId(String(driver.id))}
              />
            ))
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={assignDriver.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!driverId || assignDriver.isPending}>
            {assignDriver.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning Driver...
              </>
            ) : (
              'Assign Driver'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
