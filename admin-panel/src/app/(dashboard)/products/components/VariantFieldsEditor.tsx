'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import type { VariantFieldRow } from '@/lib/productType';

interface VariantFieldsEditorProps {
  rows: VariantFieldRow[];
  onChange: (rows: VariantFieldRow[]) => void;
}

// Like FieldNameListEditor (used for Suggested Specification Fields), but
// for Variant Fields specifically: each field also takes an optional
// comma-separated list of suggested values (e.g. Size -> "S, M, L, XL,
// XXL"). Saved once here, then pre-fills Generate Variants' value inputs
// for every product of this type — the fix for admins typing each size as
// its own separate field (as literally happened to a real Product Type
// this session) instead of one "Size" field with five values.
export function VariantFieldsEditor({ rows, onChange }: VariantFieldsEditorProps) {
  const handleKeyChange = (index: number, key: string) => {
    const next = [...rows];
    next[index] = { ...next[index], key: key.replace(/,/g, '') };
    onChange(next);
  };

  const handleValuesChange = (index: number, valuesInput: string) => {
    const next = [...rows];
    next[index] = { ...next[index], valuesInput };
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...rows, { key: '', valuesInput: '' }]);
  };

  return (
    <div className="space-y-2">
      <Label>Variant Fields</Label>
      <p className="text-xs text-muted-foreground">
        Define attribute names (e.g. Size, Warna) — these appear on the storefront when creating
        variants. Suggested values are optional, comma-separated (e.g. "S, M, L, XL, XXL"), and
        pre-fill Generate Variants; admins can still type anything when adding a variant by hand.
      </p>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Field name (e.g., Size)"
              value={row.key}
              onChange={(e) => handleKeyChange(index, e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Suggested values (e.g., S, M, L, XL, XXL)"
              value={row.valuesInput}
              onChange={(e) => handleValuesChange(index, e.target.value)}
              className="flex-[1.5]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              disabled={rows.length === 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Field
        </Button>
      </div>
    </div>
  );
}
