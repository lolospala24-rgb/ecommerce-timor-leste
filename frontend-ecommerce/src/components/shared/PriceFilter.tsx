'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PriceFilterProps {
  min: number;
  max: number;
  value?: { min: number; max: number };
  onChange: (value: { min: number; max: number }) => void;
  step?: number;
  className?: string;
}

export function PriceFilter({
  min,
  max,
  value,
  onChange,
  step = 10,
  className,
}: PriceFilterProps) {
  const [localValue, setLocalValue] = useState<{ min: number; max: number }>({
    min: value?.min || min,
    max: value?.max || max,
  });

  useEffect(() => {
    if (value) {
      setLocalValue(value);
    }
  }, [value]);

  const handleSliderChange = (values: number[]) => {
    const newValue = { min: values[0], max: values[1] };
    setLocalValue(newValue);
  };

  const handleApply = () => {
    onChange(localValue);
  };

  const handleReset = () => {
    const newValue = { min, max };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const isDefault = localValue.min === min && localValue.max === max;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Price Range</span>
          <span className="font-medium">
            ${localValue.min} - ${localValue.max}
          </span>
        </div>
        <Slider
          value={[localValue.min, localValue.max]}
          min={min}
          max={max}
          step={step}
          onValueChange={handleSliderChange}
          className="py-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            value={localValue.min}
            onChange={(e) => {
              const val = parseInt(e.target.value) || min;
              setLocalValue(prev => ({ ...prev, min: Math.min(val, prev.max) }));
            }}
            className="h-8 text-sm"
            min={min}
            max={localValue.max}
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            value={localValue.max}
            onChange={(e) => {
              const val = parseInt(e.target.value) || max;
              setLocalValue(prev => ({ ...prev, max: Math.max(val, prev.min) }));
            }}
            className="h-8 text-sm"
            min={localValue.min}
            max={max}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleApply}
          className="mt-1"
        >
          Apply
        </Button>
      </div>

      {!isDefault && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-xs text-muted-foreground"
        >
          Reset to default
        </Button>
      )}
    </div>
  );
}