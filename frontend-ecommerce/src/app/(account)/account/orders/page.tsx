'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useUserOrders } from '@/hooks/useOrders';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Package, AlertCircle } from 'lucide-react';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { StatusPill, type StatusPillTone } from '@/components/account/StatusPill';

const TABS = [
  { value: 'all', label: 'Hotu' },
  { value: 'PENDING', label: 'Atu selu' },
  { value: 'PROCESSING', label: 'Prepara' },
  { value: 'SHIPPING', label: 'Haruka hela' },
  { value: 'DELIVERED', label: 'Simu ona' },
  { value: 'CANCELLED', label: 'Kansela' },
];

const STATUS_META: Record<string, { pillLabel: string; tone: StatusPillTone; actionLabel: string }> = {
  PENDING: { pillLabel: 'Atu selu', tone: 'warning', actionLabel: 'Selu agora' },
  PAID: { pillLabel: 'Prepara', tone: 'info', actionLabel: 'Haree' },
  PROCESSING: { pillLabel: 'Prepara', tone: 'info', actionLabel: 'Haree' },
  SHIPPING: { pillLabel: 'Haruka hela', tone: 'success', actionLabel: 'Track order' },
  DELIVERED: { pillLabel: 'Simu ona', tone: 'muted', actionLabel: 'Hakerek review' },
  CANCELLED: { pillLabel: 'Kansela', tone: 'muted', actionLabel: 'Sosa fali' },
};

function statusNote(order: any): string | null {
  if (order.status === 'PENDING' && order.payment?.expiresAt) {
    return `Selu molok ${new Date(order.payment.expiresAt).toLocaleDateString()}`;
  }
  if (order.status === 'PROCESSING' || order.status === 'PAID') return 'Loja prepara hela produtu';
  if (order.status === 'DELIVERED' && order.deliveredAt) {
    return `Simu iha ${new Date(order.deliveredAt).toLocaleDateString()}`;
  }
  return null;
}

// See the mirrored helper in (shop)/orders-shop/page.tsx — same reasoning:
// order.status alone doesn't tell a customer their bank-transfer receipt
// still needs uploading or was rejected.
function getActionNeeded(order: any): string | null {
  if (order.paymentMethod !== 'BANK_TRANSFER' || order.status === 'CANCELLED') return null;
  if (!order.payment) return 'Selu presiza';
  if (order.payment.status === 'FAILED') return 'Rejeita — subi fali';
  if (order.payment.status === 'PENDING' && !order.payment.proofImage) return 'Subi resibu';
  return null;
}

export default function AccountOrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = TABS.some((t) => t.value === searchParams.get('status')) ? searchParams.get('status')! : 'all';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useUserOrders({
    page,
    limit: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  useOrderRealtime();

  return (
    <div>
      <AccountAppBar title="Ha'u-nia order" backHref="/account" />

      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }} className="mt-2">
        <TabsList className="flex h-auto flex-wrap gap-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title="La konsege hatama orders"
              description="Iha problema bainhira buka ita-nia orders. Koko fali."
              icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />}
              action={{ label: 'Koko fali', onClick: () => refetch() }}
            />
          ) : data?.data?.length === 0 ? (
            <div className="rounded-2xl border py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Seidauk iha order</h3>
              <p className="text-muted-foreground">
                {statusFilter === 'all' ? "Ita seidauk halo order ida." : 'Seidauk iha order ho estadu ida-ne’e.'}
              </p>
              <Button className="mt-4" asChild>
                <Link href="/products">Komesa sosa</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.data.map((order: any) => {
                const meta = STATUS_META[order.status] || { pillLabel: order.status, tone: 'muted' as const, actionLabel: 'Haree' };
                const actionNeeded = getActionNeeded(order);
                const note = statusNote(order);
                const firstItem = order.items?.[0];
                const detailHref = `/account/orders/${order.id}`;
                const actionHref =
                  order.status === 'DELIVERED' && firstItem?.product?.slug
                    ? `/products/${firstItem.product.slug}`
                    : order.status === 'CANCELLED'
                      ? '/products'
                      : detailHref;

                return (
                  <div key={order.id} className="overflow-hidden rounded-2xl border bg-card">
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
                      <Link href={detailHref} className="min-w-0 truncate text-sm font-semibold hover:text-primary">
                        {order.seller?.storeName || 'Loja'}
                      </Link>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {actionNeeded && <StatusPill label={actionNeeded} tone="warning" />}
                        <StatusPill label={meta.pillLabel} tone={meta.tone} />
                      </div>
                    </div>

                    <Link href={detailHref} className="flex gap-3 px-4 py-3 hover:bg-accent/50">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {firstItem?.product?.thumbnail && (
                          <Image src={firstItem.product.thumbnail} alt={firstItem.product.name} fill className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {firstItem?.product?.name || `Order #${order.orderNumber}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          x{order.items?.length || 0} · #{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
                      </div>
                    </Link>

                    <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-foreground">${order.total.toFixed(2)}</p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={actionHref}>{meta.actionLabel}</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.total}
              pageSize={data.pagination.limit}
              onPageChange={setPage}
              showTotal={false}
              className="mt-6"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
