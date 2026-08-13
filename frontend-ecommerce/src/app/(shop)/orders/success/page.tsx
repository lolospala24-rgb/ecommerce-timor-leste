'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, PackageCheck, ArrowRight, ReceiptText, Truck, Home, Loader2 } from 'lucide-react';
import { useOrder } from '@/hooks/useOrders';
import { BankTransferProof } from '@/components/checkout/BankTransferProof';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  const orderId = orderIdParam ? Number(orderIdParam) : null;
  const { data: order, isLoading, refetch } = useOrder(orderId);

  const statusLabel = order?.status ? STATUS_LABELS[order.status] ?? order.status : isLoading ? 'Loading...' : 'Pending';
  const orderDate = order?.createdAt ? new Date(order.createdAt).toLocaleString() : isLoading ? 'Loading...' : '—';

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-4 py-10 text-slate-900 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-[24px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] lg:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Order Successfully Created</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Thank you for your purchase. Your order has been placed successfully and is now being prepared for delivery.
          </p>
        </div>

        <div className="grid gap-6 rounded-[20px] border border-slate-200 bg-slate-50/70 p-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-primary">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Order Number</p>
                <p className="text-lg font-semibold">{orderId ? `#${orderId}` : 'Processing...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Status</p>
                <p className="text-lg font-semibold">{statusLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Order Date</p>
                <p className="text-lg font-semibold">{orderDate}</p>
              </div>
            </div>
            {order?.total != null && (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Order Total</p>
                  <p className="text-lg font-semibold">${Number(order.total).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">What happens next?</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>• We will confirm your order and prepare the package.</li>
              <li>• You will receive updates as it moves through processing.</li>
              <li>• A confirmation email will be sent to your inbox.</li>
            </ul>
          </div>
        </div>

        {order?.paymentMethod === 'BANK_TRANSFER' && order?.id && (
          <BankTransferProof
            orderId={order.id}
            amount={Number(order.total ?? 0)}
            payment={order.payment}
            onUpdated={() => refetch()}
          />
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/account/orders" className="inline-flex items-center gap-2 rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
            <PackageCheck className="h-4 w-4" />
            View My Orders
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <Home className="h-4 w-4" />
            Continue Shopping
          </Link>
          <button type="button" className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <ReceiptText className="h-4 w-4" />
            Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
