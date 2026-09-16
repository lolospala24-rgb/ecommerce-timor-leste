'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
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
import { useCreateTypeRequest } from '@/hooks/useProductTypeRequests';

interface RequestProductTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FieldNameRows({
  names,
  onChange,
  placeholder,
}: {
  names: string[];
  onChange: (names: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {names.map((name, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={name}
            onChange={(e) => {
              // A comma here means the seller meant a separate field — use
              // "+ Add field" instead of saving a compound name.
              const next = [...names];
              next[idx] = e.target.value.replace(/,/g, '');
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => onChange(names.filter((_, i) => i !== idx))}
            disabled={names.length === 1}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...names, ''])}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Field
      </Button>
    </div>
  );
}

const buildFieldsPayload = (names: string[]): Record<string, string> =>
  names.reduce<Record<string, string>>((acc, name) => {
    const trimmed = name.trim();
    if (trimmed) acc[trimmed] = 'select';
    return acc;
  }, {});

export function RequestProductTypeDialog({ open, onOpenChange }: RequestProductTypeDialogProps) {
  const createRequest = useCreateTypeRequest();
  const [name, setName] = useState('');
  const [nameTetum, setNameTetum] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<string[]>(['']);
  const [specFields, setSpecFields] = useState<string[]>(['']);

  const reset = () => {
    setName('');
    setNameTetum('');
    setDescription('');
    setFields(['']);
    setSpecFields(['']);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This dialog is rendered inside ProductForm's own <form> in JSX — Radix
    // portals it out of the DOM tree, but React's synthetic submit event
    // still bubbles through the *component* tree, not the DOM, so without
    // this it also fires ProductForm's handleSubmit (and its required-field
    // validation) at the same time as this one.
    e.stopPropagation();
    createRequest.mutate(
      {
        name: name.trim(),
        nameTetum: nameTetum.trim() || undefined,
        description: description.trim() || undefined,
        fields: buildFieldsPayload(fields),
        specFields: buildFieldsPayload(specFields),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a Product Type</DialogTitle>
          <DialogDescription>
            Don&apos;t see the right type for your product? Suggest a new one — an admin will review it before it
            becomes available to use.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">Type name *</Label>
              <Input id="type-name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Handwoven Textiles" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-name-tetum">Name (Tetum)</Label>
              <Input id="type-name-tetum" maxLength={100} value={nameTetum} onChange={(e) => setNameTetum(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type-description">Why is this needed?</Label>
            <Textarea
              id="type-description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Products like this need a 'Weave Pattern' option that doesn't exist yet"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Suggested variant fields</Label>
            <p className="text-xs text-muted-foreground">Options customers pick, like Color or Size.</p>
            <FieldNameRows names={fields} onChange={setFields} placeholder="Field name (e.g. Weave Pattern)" />
          </div>
          <div className="space-y-1.5">
            <Label>Suggested specification fields</Label>
            <p className="text-xs text-muted-foreground">General details shown on the product page, like Material.</p>
            <FieldNameRows names={specFields} onChange={setSpecFields} placeholder="Field name (e.g. Loom Type)" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createRequest.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRequest.isPending || !name.trim()}>
              {createRequest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
