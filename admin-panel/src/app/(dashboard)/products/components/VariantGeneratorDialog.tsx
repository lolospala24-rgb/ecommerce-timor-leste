'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { formatAttributesLabel, MANY_COMBINATIONS_WARNING_THRESHOLD } from '@/lib/variantAttributes';
import type { GeneratorAttributeRow } from '@/lib/variantAttributes';

export interface GeneratorPreviewItem {
  attributes: Record<string, string>;
  isDuplicate: boolean;
  selected: boolean;
  /** Only populated by callers that precompute a SKU suggestion at preview
   *  time (VariantManager) — StagedVariantManager leaves SKU to the
   *  backend's auto-generator once the product itself is created. */
  sku?: string;
}

interface VariantGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  step: 'input' | 'preview';
  onBack: () => void;
  rows: GeneratorAttributeRow[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onRowChange: (index: number, field: 'key' | 'valuesInput', value: string) => void;
  basePrice: number;
  onBasePriceChange: (value: number) => void;
  baseStock: number;
  onBaseStockChange: (value: number) => void;
  preview: GeneratorPreviewItem[];
  onPreview: () => void;
  onToggleItem: (index: number) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  /** "Create"/"Add" wording differs between live and staged flows. */
  confirmVerb: string;
  /** Past tense of confirmVerb — "created"/"added". */
  resultVerbPastTense: string;
  duplicateLabel: string;
}

// Shared by VariantManager and StagedVariantManager — same wizard (define
// attributes + values -> preview the cartesian product -> bulk create),
// only the actual submission side effect differs between callers (live API
// calls vs local staged-array mutation), which stays in each caller's own
// onPreview/onConfirm.
export function VariantGeneratorDialog({
  open,
  onClose,
  step,
  onBack,
  rows,
  onAddRow,
  onRemoveRow,
  onRowChange,
  basePrice,
  onBasePriceChange,
  baseStock,
  onBaseStockChange,
  preview,
  onPreview,
  onToggleItem,
  onConfirm,
  isSubmitting = false,
  confirmVerb,
  resultVerbPastTense,
  duplicateLabel,
}: VariantGeneratorDialogProps) {
  const selectedCount = preview.filter((item) => item.selected && !item.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Variants</DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? `List each attribute and its possible values — every combination will be previewed before anything is ${resultVerbPastTense}.`
              : 'Review the combinations below. Existing ones are shown grayed out and skipped.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Attribute (e.g. Color)"
                    value={row.key}
                    onChange={(e) => onRowChange(index, 'key', e.target.value)}
                    className="w-1/3"
                  />
                  <Textarea
                    placeholder="Values, comma-separated (e.g. Black, White, Red)"
                    value={row.valuesInput}
                    onChange={(e) => onRowChange(index, 'valuesInput', e.target.value)}
                    className="flex-1 min-h-[2.5rem]"
                    rows={1}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveRow(index)}
                    disabled={rows.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={onAddRow}>
                <Plus className="h-4 w-4 mr-1" />
                Add Attribute
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => onBasePriceChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Stock</Label>
                <Input
                  type="number"
                  value={baseStock}
                  onChange={(e) => onBaseStockChange(parseInt(e.target.value, 10) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to 0 so nothing becomes sellable until you set real stock.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {preview.length > MANY_COMBINATIONS_WARNING_THRESHOLD && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  This will {confirmVerb.toLowerCase()} {preview.length} variants. Double-check your
                  attribute values before continuing.
                </span>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto space-y-1.5 rounded-lg border p-2">
              {preview.map((item, index) => (
                <label
                  key={index}
                  className={`flex items-center justify-between gap-3 rounded-md p-2 text-sm ${
                    item.isDuplicate ? 'opacity-50' : 'hover:bg-muted/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.selected && !item.isDuplicate}
                      disabled={item.isDuplicate}
                      onChange={() => onToggleItem(index)}
                    />
                    <span>{formatAttributesLabel(item.attributes)}</span>
                    {item.isDuplicate && (
                      <Badge variant="outline" className="text-xs">
                        {duplicateLabel}
                      </Badge>
                    )}
                  </div>
                  {item.sku && (
                    <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                  )}
                </label>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedCount} of {preview.length} combinations selected.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {step === 'input' ? (
            <Button type="button" onClick={onPreview}>
              Preview Combinations
            </Button>
          ) : (
            <Button type="button" onClick={onConfirm} disabled={isSubmitting || selectedCount === 0}>
              {isSubmitting
                ? `${confirmVerb}ing...`
                : `${confirmVerb} ${selectedCount} Variant${selectedCount === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
