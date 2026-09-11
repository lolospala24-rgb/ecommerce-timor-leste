'use client';

import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { VariantAttributesEditor } from './VariantAttributesEditor';
import { VariantGeneratorDialog, type GeneratorPreviewItem } from './VariantGeneratorDialog';
import { VariantTable, type DisplayVariant } from './VariantTable';
import { Plus, Wand2 } from 'lucide-react';
import { fieldsToNameList } from '@/lib/productType';
import {
  canonicalizeAttributes,
  formatAttributesLabel,
  generateAttributeCombinations,
} from '@/lib/variantAttributes';
import type { GeneratorAttributeRow } from '@/lib/variantAttributes';
import toast from 'react-hot-toast';

export interface StagedVariant {
  tempId: string;
  sku?: string;
  price: number;
  comparePrice?: number | null;
  cost?: number | null;
  stock: number;
  attributes: Record<string, string>;
  images: string[];
  isActive: boolean;
}

interface StagedVariantManagerProps {
  variants: StagedVariant[];
  onChange: (variants: StagedVariant[]) => void;
  productType?: {
    id?: number;
    name?: string;
    fields?: Record<string, unknown>;
  } | null;
}

let tempIdCounter = 0;
const nextTempId = () => `staged-${Date.now()}-${tempIdCounter++}`;

export function StagedVariantManager({ variants, onChange, productType }: StagedVariantManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StagedVariant | null>(null);

  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorStep, setGeneratorStep] = useState<'input' | 'preview'>('input');
  const [generatorRows, setGeneratorRows] = useState<GeneratorAttributeRow[]>([
    { key: '', valuesInput: '' },
  ]);
  const [generatorBasePrice, setGeneratorBasePrice] = useState(0);
  const [generatorBaseStock, setGeneratorBaseStock] = useState(0);
  const [generatorPreview, setGeneratorPreview] = useState<GeneratorPreviewItem[]>([]);

  const [formData, setFormData] = useState({
    sku: '',
    price: 0,
    comparePrice: null as number | null,
    cost: null as number | null,
    stock: 0,
    images: [] as string[],
    isActive: true,
  });
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);

  const typeFieldNames = fieldsToNameList(productType?.fields);

  const buildDefaultAttributes = () =>
    typeFieldNames.length > 0 ? typeFieldNames.map((key) => ({ key, value: '' })) : [{ key: '', value: '' }];

  const resetForm = () => {
    setFormData({ sku: '', price: 0, comparePrice: null, cost: null, stock: 0, images: [], isActive: true });
    setAttributes(buildDefaultAttributes());
    setEditingTempId(null);
  };

  const handleOpenDialog = (variant?: StagedVariant) => {
    if (variant) {
      setEditingTempId(variant.tempId);
      setFormData({
        sku: variant.sku || '',
        price: variant.price || 0,
        comparePrice: variant.comparePrice ?? null,
        cost: variant.cost ?? null,
        stock: variant.stock || 0,
        images: variant.images || [],
        isActive: variant.isActive,
      });
      const attrArray = Object.entries(variant.attributes || {}).map(([key, value]) => ({ key, value: String(value) }));
      setAttributes(attrArray.length > 0 ? attrArray : [{ key: '', value: '' }]);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleAddAttribute = () => setAttributes([...attributes, { key: '', value: '' }]);
  const handleRemoveAttribute = (index: number) => setAttributes(attributes.filter((_, i) => i !== index));
  const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
    const next = [...attributes];
    next[index][field] = value;
    setAttributes(next);
  };

  const handleSubmit = () => {
    const attributesObj = attributes.reduce((acc, attr) => {
      if (attr.key && attr.value) acc[attr.key] = attr.value;
      return acc;
    }, {} as Record<string, string>);

    const canonical = canonicalizeAttributes(attributesObj);
    if (canonical) {
      const isDuplicateCombo = variants.some(
        (v) => v.tempId !== editingTempId && canonicalizeAttributes(v.attributes || {}) === canonical,
      );
      if (isDuplicateCombo) {
        toast.error('A variant with this exact combination of options already exists.');
        return;
      }
    }
    if (formData.sku.trim()) {
      const isDuplicateSku = variants.some(
        (v) => v.tempId !== editingTempId && v.sku?.toLowerCase() === formData.sku.trim().toLowerCase(),
      );
      if (isDuplicateSku) {
        toast.error(`SKU "${formData.sku.trim()}" is already used by another staged variant.`);
        return;
      }
    }
    if (!formData.price || formData.price <= 0) {
      toast.error('Variant price must be greater than 0.');
      return;
    }

    const entry: StagedVariant = {
      tempId: editingTempId ?? nextTempId(),
      sku: formData.sku.trim() || undefined,
      price: formData.price,
      comparePrice: formData.comparePrice ?? undefined,
      cost: formData.cost ?? undefined,
      stock: formData.stock,
      attributes: attributesObj,
      images: formData.images,
      isActive: formData.isActive,
    };

    if (editingTempId) {
      onChange(variants.map((v) => (v.tempId === editingTempId ? entry : v)));
    } else {
      onChange([...variants, entry]);
    }
    handleCloseDialog();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onChange(variants.filter((v) => v.tempId !== deleteTarget.tempId));
    setDeleteTarget(null);
  };

  const handleToggleActive = (tempId: string) => {
    onChange(variants.map((v) => (v.tempId === tempId ? { ...v, isActive: !v.isActive } : v)));
  };

  const openGenerator = () => {
    setGeneratorRows(
      typeFieldNames.length > 0 ? typeFieldNames.map((key) => ({ key, valuesInput: '' })) : [{ key: '', valuesInput: '' }],
    );
    setGeneratorBasePrice(0);
    setGeneratorBaseStock(0);
    setGeneratorPreview([]);
    setGeneratorStep('input');
    setIsGeneratorOpen(true);
  };
  const closeGenerator = () => setIsGeneratorOpen(false);

  const handleAddGeneratorRow = () => setGeneratorRows([...generatorRows, { key: '', valuesInput: '' }]);
  const handleRemoveGeneratorRow = (index: number) => setGeneratorRows(generatorRows.filter((_, i) => i !== index));
  const handleGeneratorRowChange = (index: number, field: 'key' | 'valuesInput', value: string) => {
    const next = [...generatorRows];
    next[index] = { ...next[index], [field]: value };
    setGeneratorRows(next);
  };

  const handlePreviewCombinations = () => {
    const combinations = generateAttributeCombinations(generatorRows);
    if (combinations.length === 0) {
      toast.error('Enter at least one attribute with at least one value.');
      return;
    }

    const existingCanonical = new Set(variants.map((v) => canonicalizeAttributes(v.attributes || {})));

    const preview: GeneratorPreviewItem[] = combinations.map((combo) => {
      const canonical = canonicalizeAttributes(combo);
      const isDuplicate = existingCanonical.has(canonical);
      return { attributes: combo, isDuplicate, selected: !isDuplicate };
    });

    setGeneratorPreview(preview);
    setGeneratorStep('preview');
  };

  const handleToggleGeneratorItem = (index: number) => {
    setGeneratorPreview((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  };

  const handleConfirmGenerate = () => {
    const toCreate = generatorPreview.filter((item) => item.selected && !item.isDuplicate);
    if (toCreate.length === 0) {
      toast.error('Select at least one combination to create.');
      return;
    }
    const newVariants: StagedVariant[] = toCreate.map((item) => ({
      tempId: nextTempId(),
      price: generatorBasePrice,
      stock: generatorBaseStock,
      attributes: item.attributes,
      images: [],
      isActive: true,
    }));
    onChange([...variants, ...newVariants]);
    toast.success(`Added ${newVariants.length} variant${newVariants.length === 1 ? '' : 's'}.`);
    closeGenerator();
  };

  const displayVariants: DisplayVariant[] = variants.map((variant) => ({
    key: variant.tempId,
    sku: variant.sku,
    skuPlaceholder: '(auto)',
    attributes: variant.attributes,
    price: variant.price,
    stock: variant.stock,
    images: variant.images,
    isActive: variant.isActive,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Variants</CardTitle>
            <CardDescription>
              Add variants (e.g. Color, Size) — these are created together with the product.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={openGenerator}>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Variants
            </Button>
            <Button type="button" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Variant
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {productType?.name && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-3 text-sm">
            <span className="font-medium">Product Type:</span> {productType.name}
            {typeFieldNames.length > 0 && (
              <span className="text-muted-foreground"> · Fields: {typeFieldNames.join(', ')}</span>
            )}
          </div>
        )}

        <VariantTable
          variants={displayVariants}
          emptyTitle="No variants yet"
          emptyHint="Add variants to offer different options for this product (optional)"
          onEdit={(key) => handleOpenDialog(variants.find((v) => v.tempId === key))}
          onToggleActive={(key) => handleToggleActive(key as string)}
          onDelete={(key) => setDeleteTarget(variants.find((v) => v.tempId === key) ?? null)}
        />
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTempId ? 'Edit Variant' : 'Add New Variant'}</DialogTitle>
            <DialogDescription>Configure variant options for this product</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  placeholder="Auto-generated if empty"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Price ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Compare Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.comparePrice || ''}
                  onChange={(e) => setFormData({ ...formData, comparePrice: parseFloat(e.target.value) || null })}
                />
              </div>
            </div>

            <VariantAttributesEditor
              attributes={attributes}
              typeFieldNames={typeFieldNames}
              onAdd={handleAddAttribute}
              onRemove={handleRemoveAttribute}
              onChange={handleAttributeChange}
            />

            <div className="space-y-2">
              <Label>Variant Images</Label>
              <ImageUpload images={formData.images} setImages={(images) => setFormData({ ...formData, images })} maxImages={5} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit}>
              {editingTempId ? 'Update Variant' : 'Add Variant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Variant"
        description={
          deleteTarget
            ? `Remove "${formatAttributesLabel(deleteTarget.attributes) || deleteTarget.sku || 'this variant'}" from this product before it's even created?`
            : ''
        }
        confirmText="Remove"
        onConfirm={handleConfirmDelete}
      />

      <VariantGeneratorDialog
        open={isGeneratorOpen}
        onClose={closeGenerator}
        step={generatorStep}
        onBack={() => setGeneratorStep('input')}
        rows={generatorRows}
        onAddRow={handleAddGeneratorRow}
        onRemoveRow={handleRemoveGeneratorRow}
        onRowChange={handleGeneratorRowChange}
        basePrice={generatorBasePrice}
        onBasePriceChange={setGeneratorBasePrice}
        baseStock={generatorBaseStock}
        onBaseStockChange={setGeneratorBaseStock}
        preview={generatorPreview}
        onPreview={handlePreviewCombinations}
        onToggleItem={handleToggleGeneratorItem}
        onConfirm={handleConfirmGenerate}
        confirmVerb="Add"
        resultVerbPastTense="added"
        duplicateLabel="Already staged"
      />
    </Card>
  );
}
