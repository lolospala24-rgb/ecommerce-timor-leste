'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useInvoice } from '@/hooks/useOrders';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer, Package, MapPin } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Awaiting Payment',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially Refunded',
};

const money = (n: number | null | undefined) =>
  `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = parseInt(params.id as string);
  const { data: invoice, isLoading } = useInvoice(orderId);
  const { settings } = useSettings();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[900px] w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Invoice Not Found</h2>
        <Button className="mt-4" onClick={() => router.push('/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const total =
    invoice.total ??
    invoice.subtotal + invoice.shippingCost + invoice.taxAmount + invoice.serviceFee - (invoice.discountAmount || 0);
  const addressLines = [
    invoice.address.street,
    invoice.address.village,
    [invoice.address.suco, invoice.address.postoAdmin].filter(Boolean).join(', '),
    invoice.address.municipality,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Screen-only toolbar — never appears on the printed/PDF output */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      {/* The document itself */}
      <div className="rounded-lg border bg-white p-10 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">
              {settings?.siteName || 'E-Commerce Timor-Leste'}
            </h1>
            <div className="mt-1.5 space-y-0.5 text-sm text-slate-500">
              {settings?.address && <p>{settings.address}</p>}
              <p>
                {[settings?.contactEmail, settings?.contactPhone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-serif text-3xl font-semibold uppercase tracking-wide text-slate-900">Invoice</p>
            <p className="mt-1 font-mono text-sm text-slate-600">{invoice.orderNumber}</p>
            <p className="mt-2 text-sm text-slate-500">
              Issued {new Date(invoice.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <span className="mt-2 inline-block rounded-full border border-slate-300 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
              {STATUS_LABEL[invoice.status] || invoice.status}
            </span>
          </div>
        </div>

        {/* Bill to / Sold by */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed To</p>
            <p className="mt-2 font-medium text-slate-900">{invoice.customer.name}</p>
            <p className="text-sm text-slate-600">{invoice.customer.email}</p>
            {invoice.customer.phone && <p className="text-sm text-slate-600">{invoice.customer.phone}</p>}
            {invoice.address.recipientName && (
              <p className="mt-1 text-sm font-medium text-slate-700">Deliver to: {invoice.address.recipientName}</p>
            )}
            {addressLines.length > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span>{addressLines.join(', ')}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sold By</p>
            <p className="mt-2 font-medium text-slate-900">{invoice.seller.storeName}</p>
            {invoice.seller.storeEmail && <p className="text-sm text-slate-600">{invoice.seller.storeEmail}</p>}
            <p className="text-sm text-slate-600">{invoice.seller.storePhone}</p>
            <p className="mt-2 text-sm text-slate-600">{invoice.seller.storeAddress}</p>
          </div>
        </div>

        {/* Line items */}
        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-2 font-semibold">Item</th>
              <th className="pb-2 px-2 text-center font-semibold">Qty</th>
              <th className="pb-2 px-2 text-right font-semibold">Unit Price</th>
              <th className="pb-2 pl-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 [break-inside:avoid]">
                <td className="py-3 pr-2">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-100 print:hidden">
                      {item.product?.thumbnail ? (
                        <Image src={item.product.thumbnail} alt={item.product.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-4 w-4 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.product?.name || 'Product'}</p>
                      <p className="text-xs text-slate-400">
                        SKU: {item.variant?.sku || item.product?.sku || '—'}
                        {item.variant?.attributes && Object.keys(item.variant.attributes).length > 0 && (
                          <span> · {Object.entries(item.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 text-center tabular-nums text-slate-700">{item.quantity}</td>
                <td className="py-3 px-2 text-right tabular-nums text-slate-700">{money(item.price)}</td>
                <td className="py-3 pl-2 text-right font-medium tabular-nums text-slate-900">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount{invoice.couponUsage?.coupon?.code ? ` (${invoice.couponUsage.coupon.code})` : ''}</span>
                <span className="tabular-nums">-{money(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="tabular-nums">{money(invoice.shippingCost)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span className="tabular-nums">{money(invoice.taxAmount)}</span>
              </div>
            )}
            {invoice.serviceFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Service Fee</span>
                <span className="tabular-nums">{money(invoice.serviceFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-semibold text-slate-900">
              <span>Total</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        {invoice.payment && (
          <div className="mt-8 rounded-md bg-slate-50 p-4 print:border print:border-slate-200 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</p>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <p className="text-slate-400">Method</p>
                <p className="font-medium text-slate-800">{invoice.payment.method === 'COD' ? 'Cash on Delivery' : 'Bank Transfer'}</p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <p className="font-medium text-slate-800">{PAYMENT_STATUS_LABEL[invoice.payment.status] || invoice.payment.status}</p>
              </div>
              {invoice.payment.paidAt && (
                <div>
                  <p className="text-slate-400">Paid On</p>
                  <p className="font-medium text-slate-800">{new Date(invoice.payment.paidAt).toLocaleDateString()}</p>
                </div>
              )}
              {invoice.payment.transactionId && (
                <div>
                  <p className="text-slate-400">Reference</p>
                  <p className="font-mono text-xs font-medium text-slate-800">{invoice.payment.transactionId}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-6 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
            <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          <p>Thank you for your business.</p>
          <p className="mt-1">Generated {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
