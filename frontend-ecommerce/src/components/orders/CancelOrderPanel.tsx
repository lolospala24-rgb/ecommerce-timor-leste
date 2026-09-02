'use client';

import { useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCancelOrder } from '@/hooks/useOrders';

interface CancelOrderPanelProps {
  orderId: number;
  orderStatus: string;
}

// Mirrors RefundRequestPanel's inline-expand pattern. Only PENDING/PAID are
// cancellable here — matches OrdersService.cancelOrder's own guard; once a
// seller has started processing/shipping, cancellation should go through
// support instead of a one-click customer action.
export function CancelOrderPanel({ orderId, orderStatus }: CancelOrderPanelProps) {
  const cancelOrder = useCancelOrder();
  const [showForm, setShowForm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  if (orderStatus !== 'PENDING' && orderStatus !== 'PAID') {
    return null;
  }

  if (!showForm) {
    return (
      <div className="rounded-[18px] border border-border p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <XCircle className="h-4 w-4" />
          Changed your mind?
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          You can cancel this order as long as it hasn&apos;t shipped yet.
        </p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
          Cancel Order
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-destructive/30 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <XCircle className="h-4 w-4" />
        Cancel this order?
      </div>
      {orderStatus === 'PAID' && (
        <p className="mt-1 text-sm text-muted-foreground">
          This order is already paid — cancelling will automatically refund your payment.
        </p>
      )}
      <Textarea
        placeholder="Why are you cancelling? (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="mt-3"
      />
      {!confirming ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
            Cancel Order
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowForm(false);
              setReason('');
            }}
          >
            Never mind
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-destructive">This can&apos;t be undone. Are you sure?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={cancelOrder.isPending}
              onClick={() =>
                cancelOrder.mutate(
                  { id: orderId, reason: reason.trim() || undefined },
                  {
                    onSuccess: () => {
                      setShowForm(false);
                      setConfirming(false);
                    },
                  },
                )
              }
            >
              {cancelOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, cancel it
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
              Go back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
