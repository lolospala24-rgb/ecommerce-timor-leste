'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface FieldNameListEditorProps {
  fieldNames: string[];
  onChange: (names: string[]) => void;
  label: string;
  description: string;
  placeholder: string;
}

// Shared by CreateProductTypeDialog (new type's Variant/Spec fields) and
// ProductTypeSelector (both its own create-dialog and its edit-existing-
// type fields) — a bare list of text inputs with add/remove, previously
// hand-copied identically in both files.
export function FieldNameListEditor({
  fieldNames,
  onChange,
  label,
  description,
  placeholder,
}: FieldNameListEditorProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      {fieldNames.map((field, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={field}
            onChange={(e) => {
              // A comma here almost always means "+ Add Field" was meant
              // instead of a literal comma-joined name — confirmed live on
              // a real ProductType ("Brand,Material,Warranty" saved as one
              // field instead of three). Strip it rather than silently
              // saving a compound key.
              const next = [...fieldNames];
              next[index] = e.target.value.replace(/,/g, '');
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
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...fieldNames, ''])}>
        <Plus className="h-4 w-4 mr-1" />
        Add Field
      </Button>
    </div>
  );
}
