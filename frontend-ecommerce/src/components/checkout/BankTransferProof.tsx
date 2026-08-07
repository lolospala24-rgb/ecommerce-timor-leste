'use client';

import { useState } from 'react';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { usePublicSettings } from '@/hooks/usePublicSettings';

interface PaymentInfo {
  id: number;
  proofImage: string | null;
  status: string;
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
      toast.error(error.response?.data?.message || 'Failed to start payment. Please try again.');
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
      await api.post('/payments/upload-proof', formData);
      toast.success('Payment proof uploaded. We will verify it shortly.');
      setFile(null);
      onUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload proof. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (payment?.proofImage) {
    return (
      <div className="flex items-start gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Payment proof submitted</p>
          <p className="mt-1 text-sm text-emerald-700">
            Our team will verify your bank transfer and update your order status shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-orange-200 bg-orange-50 p-5">
      <p className="text-sm font-semibold text-orange-900">Bank Transfer Payment</p>
      <p className="mt-1 text-sm text-orange-800">
        Please transfer <span className="font-semibold">${amount.toFixed(2)}</span> to complete your
        order, then upload your transfer receipt below for verification.
      </p>

      {settings?.bankName && (
        <div className="mt-4 rounded-[14px] border border-orange-200 bg-white p-4 text-sm text-orange-900">
          <p className="font-semibold">{settings.bankName}</p>
          {settings.bankAccountName && <p>Account Name: {settings.bankAccountName}</p>}
          {settings.bankAccountNumber && <p>Account Number: {settings.bankAccountNumber}</p>}
          {settings.bankIBAN && <p>IBAN: {settings.bankIBAN}</p>}
          {settings.bankSWIFT && <p>SWIFT/BIC: {settings.bankSWIFT}</p>}
          {settings.bankTransferInstructions && (
            <p className="mt-2 text-orange-800">{settings.bankTransferInstructions}</p>
          )}
        </div>
      )}

      {!payment ? (
        <button
          type="button"
          onClick={handleStartPayment}
          disabled={isSubmitting}
          className="mt-4 inline-flex items-center gap-2 rounded-[14px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
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
            className="text-sm text-orange-900 file:mr-3 file:rounded-full file:border-0 file:bg-orange-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
          <button
            type="button"
            onClick={handleUploadProof}
            disabled={!file || isSubmitting}
            className="inline-flex items-center gap-2 rounded-[14px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Receipt
          </button>
        </div>
      )}
    </div>
  );
}
