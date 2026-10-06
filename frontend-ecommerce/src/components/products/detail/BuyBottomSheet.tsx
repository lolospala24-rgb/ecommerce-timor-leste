'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Loader2 } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuantitySelector } from '@/components/products/QuantitySelector';
import { useShippingZones } from '@/hooks/useAddresses';
import { useShippingOptions } from '@/hooks/useShippingOptions';

interface BuyBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string | null;
  title: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  quantity: number;
  setQuantity: (quantity: number) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  confirmLabel: string;
}

// Opens on "Tau ba karreta" / "Sosa agora" taps — confirms quantity + an
// (informational only) municipality preview, then calls the existing
// handleAddToCart/handleBuyNow from ProductDetail.tsx via onConfirm. The
// municipality picked here never reaches onConfirm — same as
// ShippingEstimator elsewhere on this page, it's a preview; the real
// shipping cost is resolved at checkout against the buyer's saved address.
export function BuyBottomSheet({
  open,
  onOpenChange,
  imageUrl,
  title,
  price,
  comparePrice,
  stock,
  quantity,
  setQuantity,
  onConfirm,
  isSubmitting,
  confirmLabel,
}: BuyBottomSheetProps) {
  const { municipalities, municipalitiesLoading } = useShippingZones();
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const { data: shippingOptions } = useShippingOptions(municipalityId);

  const shippingCost = shippingOptions && shippingOptions.length > 0 ? shippingOptions[0].shippingCost : 0;
  const total = price * quantity + (municipalityId ? shippingCost : 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[28px]">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Taka"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F6F3] text-[#56635B]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <div className="flex gap-3 pr-10">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F4F6F3]">
              {imageUrl && <Image src={imageUrl} alt={title} fill className="object-cover" sizes="96px" />}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="line-clamp-2 text-sm font-semibold text-[#142019]">{title}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-lg font-extrabold text-[#17703F]">${price.toFixed(2)}</span>
                {comparePrice != null && (
                  <span className="text-xs text-[#56635B] line-through">${comparePrice.toFixed(2)}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#56635B]">Stok: {stock}</p>
            </div>
          </div>

          <div className="my-4 h-px bg-[#EEF1EE]" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#142019]">Kuantidade</p>
              <p className="text-xs text-[#56635B]">Másimu {stock}</p>
            </div>
            <QuantitySelector quantity={quantity} setQuantity={setQuantity} max={Math.max(stock, 1)} />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-sm font-semibold text-[#142019]">Haruka ba</p>
            <Select
              value={municipalityId ? String(municipalityId) : ''}
              onValueChange={(value) => setMunicipalityId(Number(value))}
              disabled={municipalitiesLoading}
            >
              <SelectTrigger className="h-11 rounded-xl border-[#DDE3DE] text-sm">
                <SelectValue placeholder="Hili munisípiu" />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F4F6F3] p-4">
            <span className="text-sm font-medium text-[#56635B]">Total ({quantity} item)</span>
            <span className="text-lg font-extrabold text-[#142019]">${total.toFixed(2)}</span>
          </div>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || stock <= 0}
            className="mt-4 flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#17703F] text-base font-bold text-white disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
