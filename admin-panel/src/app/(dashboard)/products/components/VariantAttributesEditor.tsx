'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

export interface AttributeFormRow {
  key: string;
  value: string;
}

interface VariantAttributesEditorProps {
  attributes: AttributeFormRow[];
  typeFieldNames: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: 'key' | 'value', value: string) => void;
}

// Shared by VariantManager (live API) and StagedVariantManager (staged,
// pre-creation) — the Add/Edit Variant dialog's "Attributes" section was
// identical JSX hand-copied in both.
export function VariantAttributesEditor({
  attributes,
  typeFieldNames,
  onAdd,
  onRemove,
  onChange,
}: VariantAttributesEditorProps) {
  return (
    <div className="space-y-2">
      <Label>Attributes</Label>
      <div className="space-y-2">
        {attributes.map((attr, index) => (
          <div key={index} className="flex gap-2">
            {typeFieldNames.length > 0 ? (
              <Select
                value={attr.key || undefined}
                onValueChange={(value) => onChange(index, 'key', value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {typeFieldNames.map((fieldName) => (
                    <SelectItem key={fieldName} value={fieldName}>
                      {fieldName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Key (e.g., Color)"
                value={attr.key}
                onChange={(e) => onChange(index, 'key', e.target.value)}
                className="flex-1"
              />
            )}
            <Input
              placeholder="Value (e.g., Red)"
              value={attr.value}
              onChange={(e) => onChange(index, 'value', e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              disabled={attributes.length === 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Attribute
        </Button>
      </div>
    </div>
  );
}
