'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  useCreateCoupon,
  useUpdateCoupon,
  type Coupon,
  type CouponPayload,
  type CouponDiscountType,
} from '@/hooks/useCoupons';
import toast from 'react-hot-toast';

interface CouponFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: Coupon | null;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE' as CouponDiscountType,
  discountValue: '',
  maxDiscountAmount: '',
  minPurchaseAmount: '',
  usageLimit: '',
  usageLimitPerUser: '1',
  isActive: true,
  startDate: '',
  endDate: '',
};

export function CouponForm({ open, onOpenChange, coupon }: CouponFormProps) {
  const isEdit = !!coupon;
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (coupon) {
      setForm({
        code: coupon.code,
        description: coupon.description || '',
        discountType: coupon.discountType,
        discountValue: String(coupon.discountValue),
        maxDiscountAmount: coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : '',
        minPurchaseAmount: coupon.minPurchaseAmount != null ? String(coupon.minPurchaseAmount) : '',
        usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
        usageLimitPerUser: String(coupon.usageLimitPerUser),
        isActive: coupon.isActive,
        startDate: toDateInputValue(coupon.startDate),
        endDate: toDateInputValue(coupon.endDate),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, coupon]);

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!code) {
      toast.error('Coupon code is required');
      return;
    }
    const discountValue = Number(form.discountValue);
    if (!form.discountValue || !Number.isFinite(discountValue) || discountValue <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      toast.error('Percentage discount cannot exceed 100');
      return;
    }

    const payload: CouponPayload = {
      code,
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
      minPurchaseAmount: form.minPurchaseAmount ? Number(form.minPurchaseAmount) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : 1,
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    };

    if (isEdit && coupon) {
      await updateCoupon.mutateAsync({ id: coupon.id, data: payload });
    } else {
      await createCoupon.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isSaving = createCoupon.isPending || updateCoupon.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Code</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="font-mono uppercase"
                disabled={isEdit}
                required
              />
              {isEdit && <p className="text-xs text-muted-foreground">Code can't be changed after creation.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-description">Description (admin only)</Label>
              <Input
                id="coupon-description"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="e.g. Welcome discount for new customers"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={form.discountType}
                onValueChange={(v) => handleChange('discountType', v as CouponDiscountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-value">
                Discount Value {form.discountType === 'PERCENTAGE' ? '(%)' : '($)'}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                min={0}
                max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                step="0.01"
                value={form.discountValue}
                onChange={(e) => handleChange('discountValue', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {form.discountType === 'PERCENTAGE' && (
              <div className="space-y-2">
                <Label htmlFor="coupon-max-discount">Max Discount Amount ($, optional)</Label>
                <Input
                  id="coupon-max-discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.maxDiscountAmount}
                  onChange={(e) => handleChange('maxDiscountAmount', e.target.value)}
                  placeholder="e.g. 10.00"
                />
                <p className="text-xs text-muted-foreground">Caps the discount — e.g. "20% off, up to $10".</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="coupon-min-purchase">Minimum Purchase ($, optional)</Label>
              <Input
                id="coupon-min-purchase"
                type="number"
                min={0}
                step="0.01"
                value={form.minPurchaseAmount}
                onChange={(e) => handleChange('minPurchaseAmount', e.target.value)}
                placeholder="e.g. 50.00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-usage-limit">Total Usage Limit (optional)</Label>
              <Input
                id="coupon-usage-limit"
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => handleChange('usageLimit', e.target.value)}
                placeholder="Leave blank for unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-usage-limit-per-user">Usage Limit Per Customer</Label>
              <Input
                id="coupon-usage-limit-per-user"
                type="number"
                min={1}
                value={form.usageLimitPerUser}
                onChange={(e) => handleChange('usageLimitPerUser', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-start-date">Start Date (optional)</Label>
              <Input
                id="coupon-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank to activate immediately.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-end-date">End Date (optional)</Label>
              <Input
                id="coupon-end-date"
                type="date"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank for no expiry.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="coupon-active" className="cursor-pointer">
              Active
            </Label>
            <Switch id="coupon-active" checked={form.isActive} onCheckedChange={(v) => handleChange('isActive', v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Coupon'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
