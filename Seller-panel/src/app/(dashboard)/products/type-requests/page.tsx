'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Shapes } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyTypeRequests } from '@/hooks/useProductTypeRequests';
import { RequestProductTypeDialog } from '@/components/products/RequestProductTypeDialog';
import type { ProductTypeRequestStatus } from '@/types/product.types';

// Fields are stored as `{ fieldName: "select" }` — the keys are the real
// names the seller typed, the value is always a literal marker.
const fieldNames = (fields: Record<string, string> | null | undefined) => Object.keys(fields ?? {}).join(', ');

const STATUS_CONFIG: Record<ProductTypeRequestStatus, { label: string; icon: typeof Clock; className: string }> = {
  PENDING: { label: 'Pending review', icon: Clock, className: 'bg-warning/15 text-warning' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, className: 'bg-success/15 text-success' },
  REJECTED: { label: 'Rejected', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
};

export default function TypeRequestsPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useMyTypeRequests({ page, limit: 10 });

  return (
    <div>
      <Link href="/products/new" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>
      <PageHeader
        title="Product Type Requests"
        description="Types you've suggested for admin review."
        action={<Button onClick={() => setDialogOpen(true)}>Request New Type</Button>}
      />

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <EmptyState
            icon={Shapes}
            title="No requests yet"
            description="If you can't find the right type for a product, request a new one here."
            action={
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                Request New Type
              </Button>
            }
          />
        ) : (
          <>
            <div className="divide-y">
              {data.data.map((request) => {
                const config = STATUS_CONFIG[request.status];
                const Icon = config.icon;
                const fields = fieldNames(request.fields);
                const specFields = fieldNames(request.specFields);
                return (
                  <div key={request.id} className="p-4">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{request.name}</p>
                      <Badge className={`gap-1 border-0 ${config.className}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                      </Badge>
                    </div>
                    {request.description && <p className="mb-1.5 text-sm text-muted-foreground">{request.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {fields && <span>Variant fields: {fields}</span>}
                      {specFields && <span>Spec fields: {specFields}</span>}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground/70">
                      Requested {format(new Date(request.createdAt), 'MMM d, yyyy')}
                    </p>
                    {request.status === 'REJECTED' && request.rejectionReason && (
                      <p className="mt-2 rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        {request.rejectionReason}
                      </p>
                    )}
                    {request.status === 'APPROVED' && request.resultingType && (
                      <p className="mt-2 text-sm text-success">
                        Now available as &quot;{request.resultingType.name}&quot; when creating products.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4">
              <PaginationControls
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                hasNext={data.pagination.hasNext}
                hasPrev={data.pagination.hasPrev}
                total={data.pagination.total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <RequestProductTypeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
