'use client';

import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOrderRefunds, useRequestRefund } from '@/hooks/useOrders';

const REFUND_WINDOW_DAYS = 7;

interface RefundRequestPanelProps {
  orderId: number;
  orderStatus: string;
  paymentStatus?: string | null;
  deliveredAt?: string | null;
}

// Only meaningful once an order is DELIVERED and its payment actually went
// through — matches the backend's eligibility rule in RefundsService
// (DELIVERED + within REFUND_WINDOW_DAYS of delivery + payment PAID). The
// window check here is advisory only, for UI; the backend re-validates it.
export function RefundRequestPanel({ orderId, orderStatus, paymentStatus, deliveredAt }: RefundRequestPanelProps) {
  const { data: refunds, isLoading } = useOrderRefunds(orderId);
  const requestRefund = useRequestRefund();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');

  if (orderStatus !== 'DELIVERED' || paymentStatus !== 'PAID' || isLoading) {
    return null;
  }

  const withinWindow = deliveredAt
    ? Date.now() - new Date(deliveredAt).getTime() <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000
    : true;

  const latest = refunds && refunds.length > 0 ? refunds[0] : null;

  if (latest) {
    const statusText =
      latest.status === 'PENDING'
        ? 'Your refund request is pending review.'
        : latest.status === 'APPROVED'
          ? 'Your refund was approved.'
          : `Your refund request was rejected.${latest.adminNote ? ` Reason: ${latest.adminNote}` : ''}`;
    return (
      <div className="rounded-[18px] border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <RotateCcw className="h-4 w-4" />
          Refund Request
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{statusText}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          ${latest.amount.toFixed(2)} · {latest.type === 'FULL' ? 'Full refund' : 'Partial refund'} · requested{' '}
          {new Date(latest.requestedAt).toLocaleDateString()}
        </p>
      </div>
    );
  }

  if (!withinWindow) {
    return null;
  }

  return (
    <div className="rounded-[18px] border border-border p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <RotateCcw className="h-4 w-4" />
        Need a refund?
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        You can request a refund within {REFUND_WINDOW_DAYS} days of delivery.
      </p>
      {showForm ? (
        <div className="mt-3 space-y-3">
          <Textarea
            placeholder="Tell us what went wrong..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!reason.trim() || requestRefund.isPending}
              onClick={() =>
                requestRefund.mutate(
                  { orderId, reason: reason.trim() },
                  { onSuccess: () => setShowForm(false) },
                )
              }
            >
              {requestRefund.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
          Request Refund
        </Button>
      )}
    </div>
  );
}
