'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Power } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useDeleteShippingRate, useToggleShippingRate, ShippingRateData } from '@/hooks/useShippingRates';

interface ShippingRatesTableProps {
  rates: ShippingRateData[];
  onEdit: (rate: ShippingRateData) => void;
  onRefresh: () => void;
}

export function ShippingRatesTable({ rates, onEdit, onRefresh }: ShippingRatesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ShippingRateData | null>(null);
  const { mutateAsync: deleteRate, isPending: isDeleting } = useDeleteShippingRate();
  const { mutate: toggleRate, isPending: isToggling } = useToggleShippingRate();

  const handleDeleteRate = async () => {
    if (!selectedRate) return;
    try {
      await deleteRate(selectedRate.id);
      onRefresh();
    } catch {
      // The hook already shows the error toast.
    } finally {
      setDeleteDialogOpen(false);
      setSelectedRate(null);
    }
  };

  const municipalityLabel = (rate: ShippingRateData) =>
    rate.municipalityRef?.name || rate.provinceRef?.name || 'All / Province-wide';

  const courierLabel = (rate: ShippingRateData) => rate.courier?.name || rate.courierService?.courier?.name || '-';

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Courier</TableHead>
            <TableHead>Municipality</TableHead>
            <TableHead>Service / Method</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Est. Delivery</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                No shipping rates found
              </TableCell>
            </TableRow>
          ) : (
            rates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell className="font-medium">{courierLabel(rate)}</TableCell>
                <TableCell>{municipalityLabel(rate)}</TableCell>
                <TableCell>{rate.shippingMethod || rate.courierService?.name || '-'}</TableCell>
                <TableCell>${Number(rate.shippingCost ?? 0).toFixed(2)}</TableCell>
                <TableCell>
                  {rate.estimatedDeliveryDays ? `${rate.estimatedDeliveryDays} day(s)` : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={rate.status === 'ACTIVE' ? 'secondary' : 'outline'}>{rate.status}</Badge>
                    {rate.status === 'ACTIVE' && rate.courier && rate.courier.status !== 'ACTIVE' && (
                      <span className="text-xs text-amber-600">Courier is inactive — not usable at checkout</span>
                    )}
                    {rate.status === 'ACTIVE' && rate.municipalityRef && !rate.municipalityRef.isActive && (
                      <span className="text-xs text-amber-600">Municipality is inactive — not usable at checkout</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={rate.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      onClick={() => toggleRate(rate.id)}
                      disabled={isToggling}
                    >
                      <Power className={`h-4 w-4 ${rate.status === 'ACTIVE' ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(rate)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRate(rate);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Shipping Rate"
        description={`Are you sure you want to delete "${selectedRate?.zoneName ?? 'this shipping rate'}"? This action cannot be undone. If it is referenced by existing orders, deactivate it instead.`}
        confirmText="Delete"
        onConfirm={handleDeleteRate}
        isLoading={isDeleting}
      />
    </>
  );
}
