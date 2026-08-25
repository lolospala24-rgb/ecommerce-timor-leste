'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Layers, X } from 'lucide-react';
import { ProductType, useProductTypes } from '../../../../hooks/useProductTypes';
import { buildFieldsPayload, fieldsToNameList, parseProductTypeFields } from '@/lib/productType';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ProductTypeSelectorProps {
  productId: number;
  currentTypeId?: number | null;
  onUpdate: () => void;
}

export function ProductTypeSelector({ productId, currentTypeId, onUpdate }: ProductTypeSelectorProps) {
  const { data: types, isLoading: typesLoading, refetch } = useProductTypes();
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(currentTypeId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [newTypeFields, setNewTypeFields] = useState<string[]>(['']);
  const [newTypeSpecFields, setNewTypeSpecFields] = useState<string[]>(['']);
  const [isCreating, setIsCreating] = useState(false);
  const [editFieldNames, setEditFieldNames] = useState<string[]>([]);
  const [editSpecFieldNames, setEditSpecFieldNames] = useState<string[]>([]);
  const [isSavingFields, setIsSavingFields] = useState(false);

  useEffect(() => {
    setSelectedTypeId(currentTypeId ?? null);
  }, [currentTypeId]);

  const productTypes: ProductType[] = Array.isArray(types)
    ? types
    : Array.isArray((types as any)?.data)
    ? (types as any).data
    : [];
  const selectedType = productTypes.find((t) => t.id === selectedTypeId);

  useEffect(() => {
    if (selectedType?.fields) {
      const names = fieldsToNameList(selectedType.fields);
      setEditFieldNames(names.length > 0 ? names : ['']);
    } else {
      setEditFieldNames(['']);
    }
    if (selectedType?.specFields) {
      const names = fieldsToNameList(selectedType.specFields);
      setEditSpecFieldNames(names.length > 0 ? names : ['']);
    } else {
      setEditSpecFieldNames(['']);
    }
  }, [selectedType?.id, selectedType?.fields, selectedType?.specFields]);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Product type name is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post<{ message: string; data: ProductType }>('/products/types', {
        name: newTypeName.trim(),
        description: newTypeDescription.trim() || undefined,
        fields: buildFieldsPayload(newTypeFields),
        specFields: buildFieldsPayload(newTypeSpecFields),
      });

      const createdType = (response as any)?.data ?? response;
      toast.success('Product type created successfully');
      setNewTypeName('');
      setNewTypeDescription('');
      setNewTypeFields(['']);
      setNewTypeSpecFields(['']);
      setIsCreateDialogOpen(false);
      await refetch();
      if (createdType?.id) {
        setSelectedTypeId(createdType.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create product type');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignType = async () => {
    if (!selectedTypeId) {
      toast.error('Please select a product type');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/products/${productId}`, { typeId: selectedTypeId });
      toast.success('Product type assigned successfully');
      await refetch();
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign product type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveType = async () => {
    setIsSubmitting(true);
    try {
      await api.patch(`/products/${productId}`, { typeId: null });
      toast.success('Product type removed');
      setSelectedTypeId(null);
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove product type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTypeFields = async () => {
    if (!selectedType) return;

    setIsSavingFields(true);
    try {
      await api.patch(`/products/types/${selectedType.id}`, {
        fields: buildFieldsPayload(editFieldNames),
        specFields: buildFieldsPayload(editSpecFieldNames),
      });
      toast.success('Product type fields updated');
      await refetch();
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update product type fields');
    } finally {
      setIsSavingFields(false);
    }
  };

  const renderFieldInputs = (
    fieldNames: string[],
    onChange: (names: string[]) => void,
    options: { label: string; description: string; placeholder: string },
  ) => (
    <div className="space-y-2">
      <Label>{options.label}</Label>
      <p className="text-xs text-muted-foreground">{options.description}</p>
      {fieldNames.map((field, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder={options.placeholder}
            value={field}
            onChange={(e) => {
              const next = [...fieldNames];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(fieldNames.filter((_, i) => i !== index))}
            disabled={fieldNames.length === 1}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...fieldNames, ''])}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Field
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Type</CardTitle>
            <CardDescription>
              Assign a product type to define variant fields shown on the storefront
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)} disabled={isSubmitting || isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              New Type
            </Button>
            {selectedTypeId && (
              <Button variant="outline" onClick={handleRemoveType} disabled={isSubmitting}>
                Remove Type
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Product Type</Label>
            <Select
              value={selectedTypeId?.toString() || ''}
              onValueChange={(value) => setSelectedTypeId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {typesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : productTypes.length > 0 ? (
                  productTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">No product types available</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assign Product Type</p>
              <p className="text-sm">The assigned type and its fields are shown on the product page</p>
            </div>
            <Button onClick={handleAssignType} disabled={!selectedTypeId || isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Type'}
            </Button>
          </div>

          {selectedType && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <Layers className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">{selectedType.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedType.description}</p>
                </div>
              </div>

              {parseProductTypeFields(selectedType.fields).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parseProductTypeFields(selectedType.fields).map((field) => (
                    <Badge key={field.key} variant="secondary">
                      {field.label}
                    </Badge>
                  ))}
                </div>
              )}

              {renderFieldInputs(editFieldNames, setEditFieldNames, {
                label: 'Variant Fields',
                description: 'Define attribute names (e.g. Color, Size). These appear on the storefront when creating variants.',
                placeholder: 'Field name (e.g., Color)',
              })}

              {renderFieldInputs(editSpecFieldNames, setEditSpecFieldNames, {
                label: 'Suggested Specification Fields',
                description: 'Field names admins will see as quick-add suggestions when filling in specifications for this type (e.g. Material, Warranty).',
                placeholder: 'Field name (e.g., Warranty)',
              })}

              <Button onClick={handleSaveTypeFields} disabled={isSavingFields}>
                {isSavingFields ? 'Saving...' : 'Save Type Fields'}
              </Button>
            </div>
          )}

          {!selectedType && (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No product type assigned</p>
              <p className="text-sm">Assign a product type to define variant fields for the storefront</p>
            </div>
          )}

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <span />
            </DialogTrigger>
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
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="e.g. Clothing, Electronics"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newTypeDescription}
                    onChange={(e) => setNewTypeDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                {renderFieldInputs(newTypeFields, setNewTypeFields, {
                  label: 'Variant Fields',
                  description: 'Define attribute names (e.g. Color, Size). These appear on the storefront when creating variants.',
                  placeholder: 'Field name (e.g., Color)',
                })}
                {renderFieldInputs(newTypeSpecFields, setNewTypeSpecFields, {
                  label: 'Suggested Specification Fields',
                  description: 'Shown as quick-add suggestions when filling in specifications for products of this type.',
                  placeholder: 'Field name (e.g., Warranty)',
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateType} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Type'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
