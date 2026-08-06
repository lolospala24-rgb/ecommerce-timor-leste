'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface UpdateOrderStatusProps {
  orderId: number;
  currentStatus: string;
  onUpdate: () => void;
  trigger?: React.ReactNode;
}

const statusOptions = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-500', requiresNote: false },
  { value: 'PAID', label: 'Paid', color: 'bg-blue-500', requiresNote: false },
  { value: 'PROCESSING', label: 'Processing', color: 'bg-purple-500', requiresNote: false },
  { value: 'SHIPPING', label: 'Shipping', color: 'bg-indigo-500', requiresNote: true, requiresTracking: true },
  { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-500', requiresNote: false },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500', requiresNote: true },
];

// Valid status transitions
const statusTransitions: Record<string, string[]> = {
  PENDING: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function UpdateOrderStatus({ orderId, currentStatus, onUpdate, trigger }: UpdateOrderStatusProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedStatusOption = statusOptions.find(opt => opt.value === status);
  const validTransitions = statusTransitions[currentStatus] || [];

  const handleSubmit = async () => {
    // Validate status transition
    if (status === currentStatus) {
      setError('Please select a different status');
      return;
    }

    if (!validTransitions.includes(status)) {
      setError(`Cannot transition from ${currentStatus} to ${status}`);
      return;
    }

    if (selectedStatusOption?.requiresNote && !note.trim()) {
      setError('Please provide a reason for this status change');
      return;
    }

    if (selectedStatusOption?.requiresTracking && !trackingNumber.trim()) {
      setError('Please provide a tracking number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Prepare payload - only send status, other fields are optional
      const payload: any = {
        status: status,
      };

      // Only include trackingNumber if provided
      if (trackingNumber && trackingNumber.trim()) {
        payload.trackingNumber = trackingNumber.trim();
      }

      // Only include note if provided
      if (note && note.trim()) {
        payload.note = note.trim();
      }

      console.log('📦 Updating order status:', payload);

      const response = await api.patch(`/orders/${orderId}/status`, payload);
      
      console.log('✅ Response:', response);

      toast.success(`Order status updated to ${selectedStatusOption?.label}`);
      onUpdate();
      setOpen(false);
      // Reset form
      setStatus(currentStatus);
      setTrackingNumber('');
      setNote('');
    } catch (err: any) {
      console.error('❌ Update status error:', err);
      
      if (err.response) {
        console.log('📋 Error response:', err.response.data);
        
        // Handle validation errors
        if (err.response.data?.errors) {
          const errorMessages = err.response.data.errors.join(', ');
          setError(errorMessages);
          toast.error(`Validation failed: ${errorMessages}`);
        } else if (err.response.data?.message) {
          const errorMessage = err.response.data.message;
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          const errorMessage = 'Failed to update order status';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
        toast.error('No response from server');
      } else {
        setError('Failed to update order status. Please try again.');
        toast.error('Failed to update order status');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setStatus(currentStatus);
      setTrackingNumber('');
      setNote('');
      setError('');
    }
    setOpen(newOpen);
  };

  const getStatusMessage = () => {
    if (status === 'SHIPPING') {
      return 'This will mark the order as shipped and notify the customer with tracking information.';
    }
    if (status === 'DELIVERED') {
      return 'This will mark the order as delivered. The customer will be notified.';
    }
    if (status === 'CANCELLED') {
      return 'This will cancel the order and notify the customer. Stock will be restored.';
    }
    return 'The customer will be notified about this status change.';
  };

  const isTransitionValid = status !== currentStatus && validTransitions.includes(status);

  const content = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogDescription>
          Change the status of this order. The customer will be notified automatically.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Current Status</Label>
          <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
            {statusOptions.find(opt => opt.value === currentStatus)?.label || currentStatus}
          </div>
        </div>

        <div className="space-y-2">
          <Label>New Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => {
                const isDisabled = opt.value === currentStatus || !validTransitions.includes(opt.value);
                return (
                  <SelectItem 
                    key={opt.value} 
                    value={opt.value}
                    disabled={isDisabled}
                    className={isDisabled ? 'opacity-50' : ''}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${opt.color}`} />
                      {opt.label}
                      {isDisabled && opt.value !== currentStatus && (
                        <span className="text-xs text-muted-foreground">(not allowed)</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {!isTransitionValid && status !== currentStatus && (
            <p className="text-xs text-red-500">
              This transition is not allowed. Please select a valid status.
            </p>
          )}
        </div>

        {selectedStatusOption?.requiresTracking && (
          <div className="space-y-2">
            <Label>Tracking Number</Label>
            <Input
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The tracking number will be sent to the customer via email.
            </p>
          </div>
        )}

        {selectedStatusOption?.requiresNote && (
          <div className="space-y-2">
            <Label>Reason / Note</Label>
            <Textarea
              placeholder={status === 'CANCELLED' ? 'Reason for cancellation...' : 'Additional notes...'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            {getStatusMessage()}
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !isTransitionValid}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Truck className="mr-2 h-4 w-4" />
              Update Status
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="mr-2 h-4 w-4" />
          Update Status
        </Button>
      </DialogTrigger>
      {content}
    </Dialog>
  );
}