'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Megaphone, PowerOff } from 'lucide-react';
import {
  useAdminPromotions,
  useDeactivatePromotionAdmin,
  type AdminPromotion,
  type PromotionStatus,
} from '@/hooks/usePromotions';

const STATUS_VARIANT: Record<PromotionStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'bg-primary/15 text-primary' },
  ACTIVE: { label: 'Active', className: 'bg-success/15 text-success' },
  EXPIRED: { label: 'Expired', className: 'bg-muted text-muted-foreground' },
  DEACTIVATED: { label: 'Deactivated', className: 'bg-destructive/10 text-destructive' },
};

const formatDiscount = (promo: AdminPromotion) =>
  promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : `$${promo.discountValue.toFixed(2)}`;

export default function PromotionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PromotionStatus | 'all'>('all');
  const { data, isLoading } = useAdminPromotions({ page, limit: 20, status: status === 'all' ? undefined : status });
  const deactivate = useDeactivatePromotionAdmin();
  const [deactivateTarget, setDeactivateTarget] = useState<AdminPromotion | null>(null);

  const promotions = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
        <p className="text-muted-foreground">
          Seller-created discounts across the marketplace. Sellers manage their own promotions — admins can view and
          deactivate.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Promotions</CardTitle>
            <CardDescription>{data?.pagination.total ?? 0} promotion(s)</CardDescription>
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v as PromotionStatus | 'all'); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="py-12 text-center">
              <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No promotions</h3>
              <p className="text-muted-foreground">Sellers haven&apos;t created any promotions yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => {
                  const statusConfig = STATUS_VARIANT[promo.status];
                  return (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div className="font-medium">{promo.name}</div>
                        {promo.description && (
                          <div className="text-xs text-muted-foreground">{promo.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{promo.seller.storeName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{promo.productCount}</TableCell>
                      <TableCell className="text-sm">{formatDiscount(promo)} OFF</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(promo.startAt).toLocaleDateString()} – {new Date(promo.endAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${statusConfig.className}`}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {promo.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeactivateTarget(promo)}
                          >
                            <PowerOff className="mr-1.5 h-3.5 w-3.5" />
                            Deactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate this promotion?"
        description={`"${deactivateTarget?.name}" (${deactivateTarget?.seller.storeName}) will stop applying to its products immediately.`}
        confirmText="Deactivate"
        isLoading={deactivate.isPending}
        onConfirm={() =>
          deactivateTarget &&
          deactivate.mutate(deactivateTarget.id, { onSuccess: () => setDeactivateTarget(null) })
        }
      />
    </div>
  );
}
