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
import { Wallet, CheckCircle, XCircle, Loader2, Landmark, BadgeCheck } from 'lucide-react';
import { MaskedAccountNumber } from '@/components/shared/MaskedAccountNumber';
import {
  useAdminPayouts,
  useApprovePayout,
  useRejectPayout,
  useMarkPayoutPaid,
  type Payout,
} from '@/hooks/useFinance';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
];

function PayoutStatusBadge({ status }: { status: Payout['status'] }) {
  if (status === 'PAID') return <Badge className="bg-green-600 hover:bg-green-600">Paid</Badge>;
  if (status === 'APPROVED') return <Badge className="bg-blue-600 hover:bg-blue-600">Approved</Badge>;
  if (status === 'REJECTED') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export default function PayoutsPage() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useAdminPayouts(status, page);
  const approvePayout = useApprovePayout();
  const rejectPayout = useRejectPayout();
  const markPaid = useMarkPayoutPaid();

  const [rejectTarget, setRejectTarget] = useState<Payout | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const payouts = data?.data || [];

  const handleTabChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    await rejectPayout.mutateAsync({ id: rejectTarget.id, reason: rejectReason.trim() });
    setRejectTarget(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground">
          Seller payout requests. The requested amount is reserved from the seller&apos;s available balance the
          moment they request it — approve, then mark as paid once you&apos;ve actually sent the bank transfer.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Payout Requests</CardTitle>
            <CardDescription>
              {data?.pagination?.total ?? 0} payout{(data?.pagination?.total ?? 0) === 1 ? '' : 's'}
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
          ) : payouts.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No payouts here</h3>
              <p className="text-muted-foreground">Nothing matches this filter right now.</p>
            </div>
          ) : (
            <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {payouts.map((payout) => (
                <Card key={payout.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <PayoutStatusBadge status={payout.status} />
                        </div>
                        <p className="text-sm font-medium">{payout.seller?.storeName || `Seller #${payout.sellerId}`}</p>
                        <p className="text-lg font-bold">${payout.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Landmark className="h-3.5 w-3.5" />
                          {payout.bankName} — {payout.bankAccountName} (
                          <MaskedAccountNumber value={payout.bankAccountNumber} />)
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested {new Date(payout.requestedAt).toLocaleString()}
                          {payout.processedAt && ` · Processed ${new Date(payout.processedAt).toLocaleString()}`}
                        </p>
                        {payout.adminNote && (
                          <p className="text-sm text-muted-foreground">Note: {payout.adminNote}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {payout.status === 'PENDING' && (
                          <>
                            <Button
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={approvePayout.isPending}
                              onClick={() => approvePayout.mutate({ id: payout.id })}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={rejectPayout.isPending}
                              onClick={() => setRejectTarget(payout)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        {payout.status === 'APPROVED' && (
                          <>
                            <Button
                              variant="default"
                              className="bg-primary"
                              disabled={markPaid.isPending}
                              onClick={() => markPaid.mutate(payout.id)}
                            >
                              <BadgeCheck className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={rejectPayout.isPending}
                              onClick={() => setRejectTarget(payout)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
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
            <DialogTitle>Reject Payout</DialogTitle>
            <DialogDescription>
              The reserved amount will be returned to the seller&apos;s available balance. Explain why for their records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Bank account details could not be verified..."
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
              disabled={!rejectReason.trim() || rejectPayout.isPending}
              onClick={handleReject}
            >
              {rejectPayout.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Payout'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
