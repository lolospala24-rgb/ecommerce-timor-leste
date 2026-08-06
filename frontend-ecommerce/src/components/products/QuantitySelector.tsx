'use client';

import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  setQuantity: (quantity: number) => void;
  max: number;
  min?: number;
}

export function QuantitySelector({
  quantity,
  setQuantity,
  max,
  min = 1,
}: QuantitySelectorProps) {
  const decrease = () => {
    if (quantity > min) {
      setQuantity(quantity - 1);
    }
  };

  const increase = () => {
    if (quantity < max) {
      setQuantity(quantity + 1);
    }
  };

  return (
    <div className="inline-flex items-center rounded-lg border bg-background p-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-md"
        onClick={decrease}
        disabled={quantity <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-[2.5rem] text-center text-base font-semibold tabular-nums">
        {quantity}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-md"
        onClick={increase}
        disabled={quantity >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}