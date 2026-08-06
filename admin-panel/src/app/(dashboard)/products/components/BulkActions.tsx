'use client';

import { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface BulkActionsProps {
  productIds: number[];
  onComplete: () => void;
  onCancel: () => void;
}

export function BulkActions({ productIds, onComplete, onCancel }: BulkActionsProps) {
  const [action, setAction] = useState<string>('');
  const [stockValue, setStockValue] = useState<number>(0);
  const [priceValue, setPriceValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleSubmit = () => {
    if (!action) {
      setError('Please select an action');
      return;
    }

    if (action === 'delete') {
      setError('');
      setDeleteConfirmOpen(true);
      return;
    }

    executeBulkAction();
  };

  const executeBulkAction = async () => {
    setIsLoading(true);
    setError('');

    try {
      let payload: any = { productIds, action };

      switch (action) {
        case 'set-stock':
          if (stockValue < 0) {
            throw new Error('Stock must be positive');
          }
          payload.value = stockValue;
          break;
        case 'increase-stock':
        case 'decrease-stock':
          if (stockValue <= 0) {
            throw new Error('Stock amount must be positive');
          }
          payload.value = stockValue;
          break;
        case 'set-price':
          if (priceValue <= 0) {
            throw new Error('Price must be positive');
          }
          payload.value = priceValue;
          break;
        case 'increase-price':
        case 'decrease-price':
          if (priceValue <= 0) {
            throw new Error('Price percentage must be positive');
          }
          payload.value = priceValue;
          break;
      }

      await api.post('/products/bulk-actions', payload);
      toast.success(`Bulk action completed for ${productIds.length} products`);
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to perform bulk action');
    } finally {
      setIsLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const renderActionFields = () => {
    switch (action) {
      case 'set-stock':
        return (
          <div className="space-y-2">
            <Label>Stock Quantity</Label>
            <Input
              type="number"
              min="0"
              value={stockValue}
              onChange={(e) => setStockValue(parseInt(e.target.value) || 0)}
              placeholder="Enter stock quantity"
            />
          </div>
        );
      case 'increase-stock':
      case 'decrease-stock':
        return (
          <div className="space-y-2">
            <Label>Amount to {action === 'increase-stock' ? 'Add' : 'Remove'}</Label>
            <Input
              type="number"
              min="1"
              value={stockValue}
              onChange={(e) => setStockValue(parseInt(e.target.value) || 0)}
              placeholder="Enter amount"
            />
            <p className="text-xs text-muted-foreground">
              {action === 'decrease-stock' && 'Stock will not go below 0'}
            </p>
          </div>
        );
      case 'set-price':
        return (
          <div className="space-y-2">
            <Label>New Price ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={priceValue}
              onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
              placeholder="Enter new price"
            />
          </div>
        );
      case 'increase-price':
      case 'decrease-price':
        return (
          <div className="space-y-2">
            <Label>Percentage to {action === 'increase-price' ? 'Increase' : 'Decrease'} (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={priceValue}
              onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
              placeholder="Enter percentage"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'activate': return 'Activate all selected products';
      case 'deactivate': return 'Deactivate all selected products';
      case 'delete': return 'Permanently delete all selected products';
      case 'set-stock': return 'Set stock quantity for all selected products';
      case 'increase-stock': return 'Add stock to all selected products';
      case 'decrease-stock': return 'Remove stock from all selected products';
      case 'set-price': return 'Set new price for all selected products';
      case 'increase-price': return 'Increase price by percentage for all selected products';
      case 'decrease-price': return 'Decrease price by percentage for all selected products';
      default: return '';
    }
  };

  const isDangerousAction = action === 'delete' || action === 'deactivate';

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Select Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activate">Activate Products</SelectItem>
              <SelectItem value="deactivate">Deactivate Products</SelectItem>
              <SelectItem value="set-stock">Set Stock</SelectItem>
              <SelectItem value="increase-stock">Increase Stock</SelectItem>
              <SelectItem value="decrease-stock">Decrease Stock</SelectItem>
              <SelectItem value="set-price">Set Price</SelectItem>
              <SelectItem value="increase-price">Increase Price (%)</SelectItem>
              <SelectItem value="decrease-price">Decrease Price (%)</SelectItem>
              <SelectItem value="delete" className="text-red-600">Delete Products</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {action && renderActionFields()}

        {action && (
          <Alert variant={isDangerousAction ? 'destructive' : 'default'}>
            <AlertDescription>
              {getActionDescription()}
              {action === 'delete' && (
                <p className="mt-2 font-semibold">
                  This action cannot be undone. {productIds.length} products will be permanently deleted.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!action || isLoading}
          variant={action === 'delete' ? 'destructive' : 'default'}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Apply to {productIds.length} Products
            </>
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Products"
        description={`Are you sure you want to permanently delete ${productIds.length} product${productIds.length === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText={`Delete ${productIds.length} Product${productIds.length === 1 ? '' : 's'}`}
        onConfirm={executeBulkAction}
        isLoading={isLoading}
      />
    </div>
  );
}