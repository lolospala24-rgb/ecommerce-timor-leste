'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductType } from '@/hooks/useProductTypes';
import { buildFieldsPayload } from '@/lib/productType';
import { FieldNameListEditor } from './FieldNameListEditor';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CreateProductTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (type: ProductType) => void;
}

export function CreateProductTypeDialog({ open, onOpenChange, onCreated }: CreateProductTypeDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<string[]>(['']);
  const [specFields, setSpecFields] = useState<string[]>(['']);
  const [isCreating, setIsCreating] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setFields(['']);
    setSpecFields(['']);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Product type name is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post<{ message: string; data: ProductType }>('/products/types', {
        name: name.trim(),
        description: description.trim() || undefined,
        fields: buildFieldsPayload(fields),
        specFields: buildFieldsPayload(specFields),
      });

      const createdType = (response as any)?.data ?? response;
      toast.success('Product type created successfully');
      reset();
      onOpenChange(false);
      if (createdType?.id) {
        onCreated(createdType);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create product type');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Product Type</DialogTitle>
          <DialogDescription>
            Create a type with variant fields that will appear on the storefront product page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Clothing, Electronics" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <FieldNameListEditor
            fieldNames={fields}
            onChange={setFields}
            label="Variant Fields"
            description="Define attribute names (e.g. Color, Size). These appear on the storefront when creating variants."
            placeholder="Field name (e.g., Color)"
          />
          <FieldNameListEditor
            fieldNames={specFields}
            onChange={setSpecFields}
            label="Suggested Specification Fields"
            description="Shown as quick-add suggestions when filling in specifications for products of this type."
            placeholder="Field name (e.g., Warranty)"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
