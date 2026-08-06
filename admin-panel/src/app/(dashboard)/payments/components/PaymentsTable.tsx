'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, CheckCircle, XCircle, RefreshCw, DollarSign } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface PaymentsTableProps {
  payments: any[];
  onVerifyPayment: (paymentId: number) => void;
  onRefresh: () => void;
}

export function PaymentsTable({ payments, onVerifyPayment, onRefresh }: PaymentsTableProps) {
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500',
      PAID: 'bg-green-500',
      FAILED: 'bg-red-500',
      REFUNDED: 'bg-orange-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      PAID: 'Paid',
      FAILED: 'Failed',
      REFUNDED: 'Refunded',
    };
    return labels[status] || status;
  };

  const getMethodLabel = (method: string) => {
    return method === 'COD' ? 'Cash on Delivery' : 'Bank Transfer';
  };

  const handleRefund = async () => {
    if (!selectedPayment) return;
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for refund');
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/payments/${selectedPayment.id}/refund`, { reason: refundReason });
      toast.success(`Payment refunded successfully`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setIsLoading(false);
      setRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundReason('');
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Proof</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                No payments found
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-sm">
                  {payment.order?.orderNumber || '-'}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{payment.order?.customer?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.order?.customer?.email || 'N/A'}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  ${payment.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getMethodLabel(payment.method)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(payment.status)}>
                    {getStatusLabel(payment.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs">
                    {payment.transactionId || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(payment.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {payment.proofImage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(payment.proofImage, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">No proof</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {payment.status === 'PENDING' && payment.method === 'BANK_TRANSFER' && (
                        <DropdownMenuItem onClick={() => onVerifyPayment(payment.id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Verify Payment
                        </DropdownMenuItem>
                      )}
                      {payment.status === 'PAID' && (
                        <DropdownMenuItem
                          className="text-orange-600"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setRefundDialogOpen(true);
                          }}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refund Payment
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href={`/orders/${payment.orderId}`} target="_blank">
                          <Eye className="mr-2 h-4 w-4" />
                          View Order
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        title="Refund Payment"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to refund ${selectedPayment?.amount?.toLocaleString()} for order #{selectedPayment?.order?.orderNumber}?
            </p>
            <div>
              <label className="text-sm font-medium">Reason for refund</label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="Enter refund reason..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
            <p className="text-sm text-red-600">
              This action cannot be undone. The order will be cancelled and stock will be restored.
            </p>
          </div>
        }
        confirmText="Process Refund"
        onConfirm={handleRefund}
        isLoading={isLoading}
      />
    </>
  );
}