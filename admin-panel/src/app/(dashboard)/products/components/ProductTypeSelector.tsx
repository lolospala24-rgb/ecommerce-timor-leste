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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Layers } from 'lucide-react';
import { ProductType, useProductTypes } from '../../../../hooks/useProductTypes';
import { buildFieldsPayload, fieldsToNameList, parseProductTypeFields } from '@/lib/productType';
import { CreateProductTypeDialog } from './CreateProductTypeDialog';
import { FieldNameListEditor } from './FieldNameListEditor';
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

  const handleTypeCreated = async (createdType: ProductType) => {
    await refetch();
    if (createdType?.id) {
      setSelectedTypeId(createdType.id);
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)} disabled={isSubmitting}>
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

              <FieldNameListEditor
                fieldNames={editFieldNames}
                onChange={setEditFieldNames}
                label="Variant Fields"
                description="Define attribute names (e.g. Color, Size). These appear on the storefront when creating variants."
                placeholder="Field name (e.g., Color)"
              />

              <FieldNameListEditor
                fieldNames={editSpecFieldNames}
                onChange={setEditSpecFieldNames}
                label="Suggested Specification Fields"
                description="Field names admins will see as quick-add suggestions when filling in specifications for this type (e.g. Material, Warranty)."
                placeholder="Field name (e.g., Warranty)"
              />

              <Button onClick={handleSaveTypeFields} disabled={isSavingFields}>
                {isSavingFields ? 'Saving...' : 'Save Type Fields'}
              </Button>
            </div>
          )}

          {!selectedType && (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No product type assigned</p>
              <p className="text-sm">Change the assigned type here — types are created up front on the Add New Product page</p>
            </div>
          )}
        </div>
      </CardContent>

      <CreateProductTypeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={handleTypeCreated}
      />
    </Card>
  );
}
