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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Plus, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { parseProductTypeFields } from '@/lib/productType';

interface ProductSpecificationsProps {
  productId: number;
  specifications?: Record<string, unknown> | null;
  brand?: string | null;
  // The assigned product type's suggested spec fields (see ProductType
  // .specFields) — advisory quick-add chips, never forced into the rows
  // below on their own so an admin's own custom fields are never silently
  // overwritten by switching type.
  suggestedFields?: unknown;
  onUpdate: () => void;
}

type SpecRow = { key: string; value: string };

const toRows = (specifications?: Record<string, unknown> | null): SpecRow[] => {
  const entries = Object.entries(specifications ?? {}).map(([key, value]) => ({
    key,
    value: String(value ?? ''),
  }));
  return entries.length > 0 ? entries : [{ key: '', value: '' }];
};

export function ProductSpecifications({ productId, specifications, brand, suggestedFields, onUpdate }: ProductSpecificationsProps) {
  const [brandValue, setBrandValue] = useState(brand || '');
  const [rows, setRows] = useState<SpecRow[]>(() => toRows(specifications));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBrandValue(brand || '');
    setRows(toRows(specifications));
  }, [productId, brand, specifications]);

  const handleRowChange = (index: number, field: 'key' | 'value', value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddRow = () => setRows((prev) => [...prev, { key: '', value: '' }]);

  const suggestedList = parseProductTypeFields(suggestedFields);
  const existingKeys = new Set(rows.map((r) => r.key.trim().toLowerCase()).filter(Boolean));
  const availableSuggestions = suggestedList.filter((f) => !existingKeys.has(f.key.toLowerCase()));

  const handleAddSuggested = (key: string) => {
    setRows((prev) => {
      // A single still-empty row is just the editor's starting placeholder
      // — fill it in instead of leaving a blank row dangling above it.
      if (prev.length === 1 && !prev[0].key.trim() && !prev[0].value.trim()) {
        return [{ key, value: '' }];
      }
      return [...prev, { key, value: '' }];
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const specificationsObj = rows.reduce<Record<string, string>>((acc, row) => {
        const key = row.key.trim();
        const value = row.value.trim();
        if (key && value) acc[key] = value;
        return acc;
      }, {});

      await api.patch(`/products/${productId}`, {
        brand: brandValue.trim() || undefined,
        specifications: specificationsObj,
      });

      toast.success('Specifications updated successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update specifications');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Specifications</CardTitle>
        <CardDescription>
          General product details (e.g. Material, Origin, Warranty) shown on the storefront product page —
          separate from variant options like Color or Size.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-sm">
          <Label>Brand</Label>
          <Input
            placeholder="e.g. Nike"
            value={brandValue}
            onChange={(e) => setBrandValue(e.target.value)}
          />
        </div>

        {availableSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label>Suggested for this product type</Label>
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.map((field) => (
                <Badge
                  key={field.key}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/70"
                  onClick={() => handleAddSuggested(field.key)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {field.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Specification fields</Label>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Field (e.g., Material)"
                  value={row.key}
                  onChange={(e) => handleRowChange(index, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value (e.g., 100% Cotton)"
                  value={row.value}
                  onChange={(e) => handleRowChange(index, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveRow(index)}
                  disabled={rows.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </div>

        {rows.every((row) => !row.key.trim()) && (
          <div className="text-center py-6 text-muted-foreground">
            <ListChecks className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm">No specifications yet — add fields like Material or Country of Origin.</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Specifications'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
