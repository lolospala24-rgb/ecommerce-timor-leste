'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shapes, Store, Calendar, Eye } from 'lucide-react';
import { useProductTypeRequests, type ProductTypeRequest, type ProductTypeRequestStatus } from '@/hooks/useProductTypeRequests';
import { ReviewTypeRequestDialog } from './components/ReviewTypeRequestDialog';

const TABS: { value: ProductTypeRequestStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

const STATUS_VARIANT: Record<ProductTypeRequestStatus, 'secondary' | 'default' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

export default function ProductTypeRequestsPage() {
  const [tab, setTab] = useState<ProductTypeRequestStatus | 'ALL'>('PENDING');
  const [selected, setSelected] = useState<ProductTypeRequest | null>(null);
  const { data, isLoading } = useProductTypeRequests({
    page: 1,
    limit: 50,
    status: tab === 'ALL' ? undefined : tab,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Type Requests</h1>
        <p className="text-muted-foreground">
          Sellers propose new Product Types here — review and approve to add them to the shared catalog, or reject with a reason.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>{data?.pagination.total ?? 0} total</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !data?.data.length ? (
            <div className="py-12 text-center">
              <Shapes className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">No {tab !== 'ALL' ? tab.toLowerCase() : ''} requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.data.map((request) => (
                <div key={request.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-semibold">{request.name}</p>
                      <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
                    </div>
                    {request.description && (
                      <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{request.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Store className="h-3.5 w-3.5" /> {request.seller.storeName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelected(request)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> {request.status === 'PENDING' ? 'Review' : 'View'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewTypeRequestDialog request={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
