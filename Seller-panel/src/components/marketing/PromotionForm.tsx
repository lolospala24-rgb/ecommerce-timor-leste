'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PromotionProductPicker, type PickedProduct } from './PromotionProductPicker';
import { checkPromotionConflicts, useCreatePromotion, useUpdatePromotion } from '@/hooks/usePromotions';
import type { PromotionConflict, PromotionDetail, PromotionDiscountType } from '@/types/promotion.types';

interface PromotionFormProps {
  mode: 'create' | 'edit';
  initialData?: PromotionDetail;
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in the *browser's* local time —
// new Date(isoString) already carries the right instant, this just
// re-formats it without touching the UTC value underneath. Submitting
// does the reverse: new Date(localInputValue).toISOString() — the browser
// resolves the local-time string against its own timezone, so the UTC
// instant sent to the backend is correct regardless of where the seller is.
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromotionForm({ mode, initialData }: PromotionFormProps) {
  const router = useRouter();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion(initialData?.id ?? 0);

  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [discountType, setDiscountType] = useState<PromotionDiscountType>(initialData?.discountType ?? 'PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(initialData ? String(initialData.discountValue) : '');
  const [startAt, setStartAt] = useState(initialData ? toLocalInputValue(initialData.startAt) : '');
  const [endAt, setEndAt] = useState(initialData ? toLocalInputValue(initialData.endAt) : '');
  const [selected, setSelected] = useState<Map<number, PickedProduct>>(() => {
    const map = new Map<number, PickedProduct>();
    initialData?.products.forEach((p) =>
      map.set(p.productId, { id: p.productId, name: p.name, thumbnail: p.thumbnail, price: p.price, stock: p.stock }),
    );
    return map;
  });
  const [conflicts, setConflicts] = useState<PromotionConflict[]>([]);

  const selectedList = useMemo(() => Array.from(selected.values()), [selected]);
  const numericDiscount = Number(discountValue);
  const isPercentage = discountType === 'PERCENTAGE';
  const discountValid =
    discountValue !== '' &&
    Number.isFinite(numericDiscount) &&
    (isPercentage ? numericDiscount > 0 && numericDiscount <= 100 : numericDiscount > 0);
  const scheduleValid = !!startAt && !!endAt && new Date(startAt).getTime() < new Date(endAt).getTime();

  // Live conflict preview — debounced, and only once the schedule + product
  // selection are actually complete enough to be worth checking. The
  // backend re-validates this for real at submit time regardless.
  useEffect(() => {
    const ids = Array.from(selected.keys());
    if (ids.length === 0 || !scheduleValid) {
      setConflicts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await checkPromotionConflicts({
          productIds: ids,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          excludeId: initialData?.id,
        });
        setConflicts(result.conflicts);
      } catch {
        // Preview-only — a failed check just means no warning is shown;
        // the real, authoritative check still happens on submit.
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, startAt, endAt, scheduleValid, initialData?.id]);

  const canSubmit = name.trim().length > 0 && selectedList.length > 0 && discountValid && scheduleValid && conflicts.length === 0;
  const isSaving = createPromotion.isPending || updatePromotion.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      discountType,
      discountValue: numericDiscount,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      productIds: Array.from(selected.keys()),
    };

    if (mode === 'create') {
      createPromotion.mutate(payload, { onSuccess: () => router.push('/marketing/promotions') });
    } else {
      updatePromotion.mutate(payload, { onSuccess: () => router.push('/marketing/promotions') });
    }
  };

  const effectivePrice = (price: number) =>
    Math.max(isPercentage ? price - (price * numericDiscount) / 100 : price - numericDiscount, 0);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">1. Promotion Information</h2>
        <div className="space-y-1.5">
          <Label htmlFor="promo-name">Promotion name *</Label>
          <Input
            id="promo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend Sale"
            maxLength={100}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-description">Description</Label>
          <Textarea
            id="promo-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Optional note for your own reference — customers won't see this label"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">2. Products</h2>
        <p className="text-sm text-muted-foreground">Choose which of your products this promotion applies to.</p>
        <PromotionProductPicker selected={selected} onChange={setSelected} />
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">3. Discount</h2>
        <RadioGroup
          value={discountType}
          onValueChange={(v) => setDiscountType(v as PromotionDiscountType)}
          className="flex flex-row gap-6"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="PERCENTAGE" /> Percentage off
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="FIXED_AMOUNT" /> Fixed amount off
          </label>
        </RadioGroup>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="discount-value">{isPercentage ? 'Percentage (%)' : 'Amount ($)'}</Label>
          <Input
            id="discount-value"
            type="number"
            min={0}
            max={isPercentage ? 100 : undefined}
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder={isPercentage ? 'e.g. 20' : 'e.g. 5.00'}
          />
          {discountValue !== '' && !discountValid && (
            <p className="text-xs text-destructive">
              {isPercentage ? 'Enter a value greater than 0 and at most 100.' : 'Enter an amount greater than 0.'}
            </p>
          )}
        </div>

        {selectedList.length > 0 && discountValid && (
          <div className="space-y-1.5 rounded-md bg-muted/50 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Preview</p>
            {selectedList.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{p.name}</span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  <span className="font-semibold text-primary">${effectivePrice(p.price).toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground line-through">${p.price.toFixed(2)}</span>
                </span>
              </div>
            ))}
            {selectedList.length > 3 && (
              <p className="text-xs text-muted-foreground">+{selectedList.length - 3} more product(s)</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">4. Schedule</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="start-at">Start date/time *</Label>
            <Input id="start-at" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end-at">End date/time *</Label>
            <Input id="end-at" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </div>
        </div>
        {startAt && endAt && !scheduleValid && (
          <p className="text-xs text-destructive">End date/time must be after the start date/time.</p>
        )}
      </section>

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Some products are already in another active promotion:</p>
          <ul className="mt-1.5 list-disc pl-5">
            {conflicts.map((c) => (
              <li key={`${c.productId}-${c.promotionId}`}>
                &quot;{c.productName}&quot; is already included in &quot;{c.promotionName}&quot;
              </li>
            ))}
          </ul>
          <p className="mt-1.5">Remove these products from this promotion, or end the other one first.</p>
        </div>
      )}

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">5. Review &amp; Publish</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Products</dt>
            <dd className="font-medium">{selectedList.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="font-medium">
              {discountValid ? (isPercentage ? `${numericDiscount}% OFF` : `$${numericDiscount.toFixed(2)} OFF`) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Starts</dt>
            <dd className="font-medium">{startAt ? format(new Date(startAt), 'MMM d, HH:mm') : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ends</dt>
            <dd className="font-medium">{endAt ? format(new Date(endAt), 'MMM d, HH:mm') : '—'}</dd>
          </div>
        </dl>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push('/marketing/promotions')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === 'create' ? 'Publish Promotion' : 'Save Changes'}
          </Button>
        </div>
      </section>
    </form>
  );
}
