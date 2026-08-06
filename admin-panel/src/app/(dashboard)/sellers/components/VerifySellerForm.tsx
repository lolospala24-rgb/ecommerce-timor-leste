'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface VerifySellerFormProps {
  seller: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VerifySellerForm({ seller, onSuccess, onCancel }: VerifySellerFormProps) {
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sellerData = seller && ((seller as any).data ?? seller);
  const sellerId = sellerData?.id;
  const sellerName = sellerData?.storeName || 'Seller';
  const sellerOwner = sellerData?.user?.name || 'N/A';
  const sellerEmail = sellerData?.user?.email || sellerData?.storeEmail || 'N/A';
  const sellerPhone = sellerData?.storePhone || 'N/A';
  const sellerAddress = sellerData?.storeAddress || 'N/A';
  const sellerDescription = sellerData?.description;
  const sellerCreatedAt = sellerData?.createdAt;

  const handleSubmit = async () => {
    if (!sellerId) {
      setError('Unable to verify seller: missing seller ID.');
      return;
    }
    if (decision === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = decision === 'approve'
        ? `/sellers/${sellerId}/verify`
        : `/sellers/${sellerId}/reject`;

      const payload = decision === 'approve'
        ? { isApproved: true }
        : { reason: rejectionReason };

      await api.post(endpoint, payload);
      
      const message = decision === 'approve' 
        ? `Seller ${sellerName} has been approved` 
        : `Seller ${sellerName} has been rejected`;
      
      toast.success(message);
      onSuccess();
    } catch (err: any) {
      console.error('VerifySellerForm error:', err);
      
      let errorMessage = 'Failed to process verification';
      
      if (err.response) {
        errorMessage = err.response.data?.message || errorMessage;
        
        if (err.response.data?.errors) {
          errorMessage = err.response.data.errors.join(', ');
        }
        
        if (err.response.data?.message?.includes('already verified')) {
          errorMessage = 'This seller is already verified';
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seller Info Summary */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
        <h4 className="font-medium">Application Summary</h4>
        <div className="text-sm space-y-1">
          <p><span className="font-medium">Store:</span> {sellerName}</p>
          <p><span className="font-medium">Owner:</span> {sellerOwner}</p>
          <p><span className="font-medium">Email:</span> {sellerEmail}</p>
          <p><span className="font-medium">Phone:</span> {sellerPhone}</p>
          <p><span className="font-medium">Address:</span> {sellerAddress}</p>
          {sellerDescription && (
            <p><span className="font-medium">Description:</span> {sellerDescription}</p>
          )}
          <p><span className="font-medium">Joined:</span> {sellerCreatedAt ? new Date(sellerCreatedAt).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Label>Decision</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={decision === 'approve' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${decision === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={() => setDecision('approve')}
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
          <Button
            type="button"
            variant={decision === 'reject' ? 'destructive' : 'outline'}
            className="flex items-center gap-2"
            onClick={() => setDecision('reject')}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>

      {decision === 'reject' && (
        <div className="space-y-2">
          <Label htmlFor="reason">Rejection Reason</Label>
          <Textarea
            id="reason"
            placeholder="Please explain why this seller application is being rejected..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This reason will be sent to the seller via email
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          variant={decision === 'approve' ? 'default' : 'destructive'}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : decision === 'approve' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Seller
            </>
          ) : (
            <>
              <XCircle className="mr-2 h-4 w-4" />
              Reject Seller
            </>
          )}
        </Button>
      </div>
    </div>
  );
}