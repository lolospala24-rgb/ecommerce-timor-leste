'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CategoryOption {
  id: number;
  name: string;
  parentId: number | null;
}

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOptions: CategoryOption[];
  onCreated: (category: { id: number; name: string; parentId: number | null }) => void;
}

export function CreateCategoryDialog({ open, onOpenChange, parentOptions, onCreated }: CreateCategoryDialogProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('none');
  const [isCreating, setIsCreating] = useState(false);

  const reset = () => {
    setName('');
    setParentId('none');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post<{ message: string; data: CategoryOption }>('/categories', {
        name: name.trim(),
        parentId: parentId === 'none' ? undefined : parseInt(parentId),
      });

      const created = (response as any)?.data ?? response;
      toast.success('Category created successfully');
      reset();
      onOpenChange(false);
      if (created?.id) {
        onCreated(created);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>Create a category or sub-category for products.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smartphones" />
          </div>
          <div className="space-y-2">
            <Label>Parent Category (optional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="None (top-level category)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level category)</SelectItem>
                {parentOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
