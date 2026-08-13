'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RotateCcw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAdminRefunds, useApproveRefund, useRejectRefund, type Refund } from '@/hooks/useFinance';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

function RefundStatusBadge({ status }: { status: Refund['status'] }) {
  if (status === 'APPROVED') return <Badge className="bg-green-600 hover:bg-green-600">Approved</Badge>;
  if (status === 'REJECTED') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export default function RefundsPage() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useAdminRefunds(status, page);
  const approveRefund = useApproveRefund();
  const rejectRefund = useRejectRefund();

  const [rejectTarget, setRejectTarget] = useState<Refund | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const refunds = data?.data || [];

  const handleTabChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    await rejectRefund.mutateAsync({ id: rejectTarget.id, reason: rejectReason.trim() });
    setRejectTarget(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Refunds</h1>
        <p className="text-muted-foreground">
          Review customer refund requests and admin-initiated refunds. Approving reverses the seller&apos;s earnings automatically.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Refund Requests</CardTitle>
            <CardDescription>
              {data?.pagination?.total ?? 0} refund{(data?.pagination?.total ?? 0) === 1 ? '' : 's'}
            </CardDescription>
          </div>
          <Tabs value={status} onValueChange={handleTabChange}>
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : refunds.length === 0 ? (
            <div className="text-center py-12">
              <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No refunds here</h3>
              <p className="text-muted-foreground">Nothing matches this filter right now.</p>
            </div>
          ) : (
            <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {refunds.map((refund) => (
                <Card key={refund.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <RefundStatusBadge status={refund.status} />
                          <Badge variant="outline">{refund.type === 'FULL' ? 'Full refund' : 'Partial refund'}</Badge>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">Order {refund.order?.orderNumber || refund.orderId}</span>
                          {refund.order?.seller?.storeName && (
                            <span className="text-muted-foreground"> · sold by {refund.order.seller.storeName}</span>
                          )}
                        </p>
                        <p className="text-lg font-bold">
                          ${refund.amount.toFixed(2)}
                          {refund.order?.total && refund.type === 'PARTIAL' && (
                            <span className="text-sm font-normal text-muted-foreground"> of ${refund.order.total.toFixed(2)}</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested by {refund.requester?.name || 'Unknown'} ({refund.requester?.email || 'N/A'}) on{' '}
                          {new Date(refund.requestedAt).toLocaleString()}
                        </p>
                        <p className="text-sm">Reason: {refund.reason}</p>
                        {refund.adminNote && (
                          <p className="text-sm text-muted-foreground">Admin note: {refund.adminNote}</p>
                        )}
                      </div>
                      {refund.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={approveRefund.isPending}
                            onClick={() => approveRefund.mutate({ id: refund.id })}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={rejectRefund.isPending}
                            onClick={() => setRejectTarget(refund)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund</DialogTitle>
            <DialogDescription>
              Explain why this refund request is being rejected. The customer will see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Item was confirmed delivered in good condition..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectRefund.isPending}
              onClick={handleReject}
            >
              {rejectRefund.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
