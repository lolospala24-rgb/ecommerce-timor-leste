'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, Loader2, PackageX } from 'lucide-react';
import { useShippingZones } from '@/hooks/useAddresses';
import { useShippingOptions } from '@/hooks/useShippingOptions';
import { formatCurrency } from '@/lib/formatters';

export function ShippingEstimator() {
  const { municipalities, municipalitiesLoading } = useShippingZones();
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const { data: options, isLoading, isFetched } = useShippingOptions(municipalityId);

  return (
    <div className="flex items-start gap-3 text-sm">
      <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-2">
        <span className="font-medium text-foreground">Shipping</span>

        <Select
          value={municipalityId ? String(municipalityId) : ''}
          onValueChange={(value) => setMunicipalityId(Number(value))}
          disabled={municipalitiesLoading}
        >
          <SelectTrigger className="h-9 max-w-xs text-sm">
            <SelectValue placeholder="Select your municipality to see cost" />
          </SelectTrigger>
          <SelectContent>
            {municipalities.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {municipalityId && (
          <div className="space-y-1.5 pt-1">
            {isLoading ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking shipping options...
              </p>
            ) : options && options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.shippingZoneId}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {option.courierName || 'Standard'}
                      {option.shippingMethod ? ` — ${option.shippingMethod}` : ''}
                    </p>
                    {option.estimatedDeliveryDays != null && (
                      <p className="text-xs text-muted-foreground">
                        Arrives in {option.estimatedDeliveryDays} day{option.estimatedDeliveryDays === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {option.shippingCost === 0 ? 'Free' : formatCurrency(option.shippingCost)}
                  </span>
                </div>
              ))
            ) : (
              isFetched && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PackageX className="h-3.5 w-3.5" />
                  No shipping option found for this area yet — cost will be confirmed at checkout.
                </p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
