'use client';

import { useState } from 'react';
import { Loader2, Upload, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { usePublicSettings } from '@/hooks/usePublicSettings';

interface PaymentInfo {
  id: number;
  proofImage: string | null;
  status: string;
  notes?: string | null;
}

interface BankTransferProofProps {
  orderId: number;
  amount: number;
  payment: PaymentInfo | null | undefined;
  onUpdated: () => void;
}

// Bank transfer orders don't get a Payment record at checkout the way COD
// orders do (backend only auto-creates one for PaymentMethod.COD) — the
// customer has to explicitly start one via POST /payments, then upload a
// receipt via POST /payments/upload-proof for an admin to verify.
export function BankTransferProof({ orderId, amount, payment, onUpdated }: BankTransferProofProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: settings } = usePublicSettings();

  const handleStartPayment = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/payments', { orderId, paymentMethod: 'BANK_TRANSFER' });
      toast.success('Now upload your transfer receipt below.');
      onUpdated();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to start payment. Please try again.';
      toast.error(message);
      // A payment for this order already exists server-side but the `payment`
      // prop we were given is stale/null (e.g. cached from before it was
      // created, or created from another tab). Without this, the button
      // stays visible and every click repeats the exact same failure —
      // resync so the component re-renders with whatever state the payment
      // actually is in (upload form, awaiting review, confirmed, rejected).
      if (message.includes('Payment already exists')) {
        onUpdated();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadProof = async () => {
    if (!file || !payment?.id) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('proofImage', file);
      formData.append('paymentId', String(payment.id));
      // The shared axios instance defaults every request to
      // Content-Type: application/json, which for a FormData body means
      // the browser never gets to set its own multipart boundary header —
      // the backend then sees no parseable file at all. Unsetting it here
      // lets axios/the browser generate the correct
      // "multipart/form-data; boundary=..." header for this request only.
      await api.post('/payments/upload-proof', formData, {
        headers: { 'Content-Type': undefined },
      });
      toast.success('Payment proof uploaded. We will verify it shortly.');
      setFile(null);
      onUpdated();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to upload proof. Please try again.';
      toast.error(message);
      // Same staleness case as handleStartPayment: our `payment.status` prop
      // says PENDING but the server has already moved on (confirmed/
      // rejected elsewhere) — resync instead of leaving the upload form
      // stuck offering an action that will keep failing.
      if (message.includes('already processed')) {
        onUpdated();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status drives what's shown, not just whether proof was uploaded — a
  // payment can leave PENDING (confirmed or rejected by an admin) with or
  // without proof ever having been attached. Branching on proofImage alone
  // left FAILED/PAID payments stuck showing the upload form forever, and
  // every retry hit the backend's "already processed" guard with no
  // explanation of why.
  if (payment?.status === 'PAID') {
    return (
      <div className="flex items-start gap-3 rounded-[18px] border border-green-200 bg-green-50 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-800">Payment confirmed</p>
          <p className="mt-1 text-sm text-green-700">
            Your bank transfer has been verified. Thank you!
          </p>
        </div>
      </div>
    );
  }

  if (payment?.status === 'FAILED') {
    return (
      <div className="rounded-[18px] border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">Payment rejected</p>
            <p className="mt-1 text-sm text-red-700">
              {payment.notes || 'Our team could not verify this bank transfer.'} Upload a new receipt below to try again.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-red-200 pt-4 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm text-red-900 file:mr-3 file:rounded-full file:border-0 file:bg-red-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
          <button
            type="button"
            onClick={handleUploadProof}
            disabled={!file || isSubmitting}
            className="inline-flex items-center gap-2 rounded-[14px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload New Receipt
          </button>
        </div>
      </div>
    );
  }

  if (payment?.proofImage) {
    return (
      <div className="flex items-start gap-3 rounded-[18px] border border-green-200 bg-green-50 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-800">Payment proof submitted</p>
          <p className="mt-1 text-sm text-green-700">
            Our team will verify your bank transfer and update your order status shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">Bank Transfer Payment</p>
      <p className="mt-1 text-sm text-amber-800">
        Please transfer <span className="font-semibold">${amount.toFixed(2)}</span> to complete your
        order, then upload your transfer receipt below for verification.
      </p>

      {settings?.bankName && (
        <div className="mt-4 rounded-[14px] border border-amber-200 bg-white p-4 text-sm text-amber-900">
          <p className="font-semibold">{settings.bankName}</p>
          {settings.bankAccountName && <p>Account Name: {settings.bankAccountName}</p>}
          {settings.bankAccountNumber && <p>Account Number: {settings.bankAccountNumber}</p>}
          {settings.bankIBAN && <p>IBAN: {settings.bankIBAN}</p>}
          {settings.bankSWIFT && <p>SWIFT/BIC: {settings.bankSWIFT}</p>}
          {settings.bankTransferInstructions && (
            <p className="mt-2 text-amber-800">{settings.bankTransferInstructions}</p>
          )}
        </div>
      )}

      {!payment ? (
        <button
          type="button"
          onClick={handleStartPayment}
          disabled={isSubmitting}
          className="mt-4 inline-flex items-center gap-2 rounded-[14px] bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          I&apos;ve made the transfer
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm text-amber-900 file:mr-3 file:rounded-full file:border-0 file:bg-amber-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
          <button
            type="button"
            onClick={handleUploadProof}
            disabled={!file || isSubmitting}
            className="inline-flex items-center gap-2 rounded-[14px] bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Receipt
          </button>
        </div>
      )}
    </div>
  );
}
