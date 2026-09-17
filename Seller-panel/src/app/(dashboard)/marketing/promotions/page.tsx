'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MoreVertical,
  Pencil,
  Percent,
  Plus,
  PowerOff,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePromotions, useDeactivatePromotion, useDeletePromotion } from '@/hooks/usePromotions';
import type { Promotion, PromotionStatus } from '@/types/promotion.types';

const STATUS_CONFIG: Record<PromotionStatus, { label: string; icon: typeof Clock; className: string }> = {
  SCHEDULED: { label: 'Scheduled', icon: Clock, className: 'bg-primary/15 text-primary' },
  ACTIVE: { label: 'Active', icon: CheckCircle2, className: 'bg-success/15 text-success' },
  EXPIRED: { label: 'Expired', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  DEACTIVATED: { label: 'Deactivated', icon: PowerOff, className: 'bg-destructive/10 text-destructive' },
};

const formatDiscount = (promo: Promotion) =>
  promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `$${promo.discountValue.toFixed(2)} OFF`;

function PromotionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') || 1);
  const status = (searchParams.get('status') as PromotionStatus | null) || undefined;

  const { data, isLoading } = usePromotions({ page, limit: 10, status });
  const deactivate = useDeactivatePromotion();
  const remove = useDeletePromotion();
  const [deactivateTarget, setDeactivateTarget] = useState<Promotion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    router.push(`/marketing/promotions?${params.toString()}`);
  };

  const promotions = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Create and manage special offers for your products."
        action={
          <Button asChild>
            <Link href="/marketing/promotions/new">
              <Plus className="mr-2 h-4 w-4" /> Create Promotion
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Select value={status || 'all'} onValueChange={(v) => updateParam('status', v === 'all' ? null : v)}>
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
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No promotions yet"
            description="Create a promotion to offer a percentage or fixed discount on your products for a limited time."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/marketing/promotions/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Promotion
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => {
                  const config = STATUS_CONFIG[promo.status];
                  const Icon = config.icon;
                  const canEdit = promo.status === 'SCHEDULED' || promo.status === 'ACTIVE';
                  return (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{promo.name}</p>
                        {promo.description && (
                          <p className="max-w-xs truncate text-xs text-muted-foreground">{promo.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {promo.productCount} product{promo.productCount === 1 ? '' : 's'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 border-0 bg-accent">
                          <Percent className="h-3 w-3" /> {formatDiscount(promo)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(promo.startAt), 'MMM d')} – {format(new Date(promo.endAt), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 border-0 ${config.className}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem asChild>
                                <Link href={`/marketing/promotions/${promo.id}/edit`}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {promo.isActive && (
                              <DropdownMenuItem onClick={() => setDeactivateTarget(promo)}>
                                <PowerOff className="mr-2 h-4 w-4" /> Deactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(promo)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {data && (
              <div className="p-4">
                <PaginationControls
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  hasNext={data.pagination.hasNext}
                  hasPrev={data.pagination.hasPrev}
                  total={data.pagination.total}
                  onPageChange={(p) => updateParam('page', String(p))}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate this promotion?"
        description={`"${deactivateTarget?.name}" will stop applying to its products immediately. You can't reactivate it — create a new promotion instead.`}
        confirmText="Deactivate"
        isLoading={deactivate.isPending}
        onConfirm={() =>
          deactivateTarget &&
          deactivate.mutate(deactivateTarget.id, { onSuccess: () => setDeactivateTarget(null) })
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This can't be undone. Past orders that used this promotion keep the price customers actually paid."
        confirmText="Delete"
        isLoading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  );
}

export default function PromotionsPage() {
  return (
    <Suspense fallback={null}>
      <PromotionsPageContent />
    </Suspense>
  );
}
