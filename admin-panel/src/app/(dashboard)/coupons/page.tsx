'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pencil, Trash2, Plus, TicketPercent } from 'lucide-react';
import {
  useCoupons,
  useUpdateCoupon,
  useDeleteCoupon,
  type Coupon,
} from '@/hooks/useCoupons';
import { CouponForm } from './components/CouponForm';

function formatDiscount(coupon: Coupon): string {
  return coupon.discountType === 'PERCENTAGE'
    ? `${coupon.discountValue}%${coupon.maxDiscountAmount ? ` (up to $${coupon.maxDiscountAmount.toFixed(2)})` : ''}`
    : `$${coupon.discountValue.toFixed(2)}`;
}

function formatValidity(coupon: Coupon): string {
  if (!coupon.startDate && !coupon.endDate) return 'Always active';
  const start = coupon.startDate ? new Date(coupon.startDate).toLocaleDateString() : '…';
  const end = coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : '…';
  return `${start} – ${end}`;
}

function isExpired(coupon: Coupon): boolean {
  return !!coupon.endDate && new Date(coupon.endDate).getTime() < Date.now();
}

export default function CouponsPage() {
  const { data: coupons, isLoading } = useCoupons();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const openCreate = () => {
    setEditingCoupon(null);
    setFormOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteCoupon.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">
            Discount codes customers can apply at checkout — usage limits and validity are enforced server-side.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coupons</CardTitle>
          <CardDescription>
            {coupons?.length ?? 0} coupon{(coupons?.length ?? 0) === 1 ? '' : 's'} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !coupons || coupons.length === 0 ? (
            <div className="py-12 text-center">
              <TicketPercent className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No coupons yet</h3>
              <p className="text-muted-foreground">Add your first discount code to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon);
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="font-mono font-medium">{coupon.code}</div>
                        {coupon.description && (
                          <div className="text-xs text-muted-foreground">{coupon.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDiscount(coupon)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {coupon.usedCount}
                        {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ''}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={coupon.isActive}
                            onCheckedChange={(checked) => updateCoupon.mutate({ id: coupon.id, data: { isActive: checked } })}
                            aria-label="Toggle active"
                          />
                          {expired ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : (
                            <Badge variant={coupon.isActive ? 'default' : 'secondary'}>
                              {coupon.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatValidity(coupon)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(coupon)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(coupon)}
                            aria-label="Delete coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CouponForm open={formOpen} onOpenChange={setFormOpen} coupon={editingCoupon} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this coupon?"
        description={`"${deleteTarget?.code}" will be permanently removed. This cannot be undone. Coupons that have already been used by customers can't be deleted — deactivate them instead.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={deleteCoupon.isPending}
        variant="destructive"
      />
    </div>
  );
}
