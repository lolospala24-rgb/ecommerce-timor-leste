'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import { usePayment } from '@/hooks/usePayments';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface VerifyPaymentModalProps {
  paymentId: number | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function VerifyPaymentModal({ paymentId, open, onClose, onRefresh }: VerifyPaymentModalProps) {
  const { data: payment, isLoading } = usePayment(paymentId || 0);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!paymentId) return null;

  const handleSubmit = async () => {
    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (action === 'approve') {
        await api.post(`/payments/${paymentId}/confirm`, {});
        toast.success('Payment approved successfully');
      } else {
        await api.post(`/payments/${paymentId}/reject`, {
          reason: rejectionReason,
        });
        toast.success('Payment rejected');
      }
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodLabel = (method: string) => {
    return method === 'COD' ? 'Cash on Delivery' : 'Bank Transfer';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verify Payment</DialogTitle>
          <DialogDescription>
            Review the payment proof and verify the transaction
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !payment ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Payment not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Payment Details</h3>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Order Number:</span>
                  <p className="font-mono">{payment.order?.orderNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <p>{payment.order?.customer?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-bold text-primary">${payment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <p>{getMethodLabel(payment.method)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Date:</span>
                  <p>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '—'}</p>
                </div>
                {payment.notes && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Customer Notes:</span>
                    <p className="text-sm">{payment.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Proof */}
            {payment.proofImage ? (
              <div className="space-y-2">
                <Label>Payment Proof</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="relative min-h-[200px] flex items-center justify-center">
                    <Image
                      src={payment.proofImage}
                      alt="Payment Proof"
                      width={400}
                      height={300}
                      className="max-w-full h-auto object-contain rounded-lg"
                    />
                  </div>
                  <div className="mt-3 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(payment.proofImage as string, '_blank')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Full Size
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No payment proof uploaded. This payment cannot be verified.
                </AlertDescription>
              </Alert>
            )}

            {/* Verification Decision */}
            <div className="space-y-4">
              <Label>Verification Decision</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={action === 'approve' ? 'default' : 'outline'}
                  className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setAction('approve')}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Payment
                </Button>
                <Button
                  type="button"
                  variant={action === 'reject' ? 'destructive' : 'outline'}
                  onClick={() => setAction('reject')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Payment
                </Button>
              </div>

              {action === 'reject' && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="reason">Rejection Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why this payment is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason will be sent to the customer via email
                  </p>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertDescription className="text-sm">
                {action === 'approve' 
                  ? 'Approving this payment will mark the order as PAID and notify the customer.'
                  : 'Rejecting this payment will mark the order as PAYMENT FAILED and notify the customer.'}
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                variant={action === 'approve' ? 'default' : 'destructive'}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : action === 'approve' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Payment
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}