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
  slugifyVariantValue,
} from '@/lib/variantAttributes';
import type { GeneratorAttributeRow } from '@/lib/variantAttributes';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface VariantManagerProps {
  productId: number;
  variants: any[];
  productType?: {
    id?: number;
    name?: string;
    fields?: Record<string, unknown>;
  } | null;
  onUpdate: () => void;
}

export function VariantManager({ productId, variants, productType, onUpdate }: VariantManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Variant generator: define attribute names + comma-separated values,
  // preview the cartesian product, then bulk-create. There's no bulk
  // backend endpoint for this — each combination is POSTed individually
  // to the existing single-variant endpoint (which already enforces
  // duplicate-combination + SKU rules), so nothing new had to be built
  // server-side and the same safety checks apply.
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorStep, setGeneratorStep] = useState<'input' | 'preview'>('input');
  const [generatorRows, setGeneratorRows] = useState<GeneratorAttributeRow[]>([
    { key: '', valuesInput: '' },
  ]);
  const [generatorBasePrice, setGeneratorBasePrice] = useState(0);
  const [generatorBaseStock, setGeneratorBaseStock] = useState(0);
  const [generatorPreview, setGeneratorPreview] = useState<GeneratorPreviewItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    price: 0,
    comparePrice: null as number | null,
    cost: null as number | null,
    stock: 0,
    attributes: {} as Record<string, string>,
    images: [] as string[],
    isActive: true,
  });

  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);

  const typeFieldNames = fieldsToNameList(productType?.fields);

  const buildDefaultAttributes = () => {
    if (typeFieldNames.length > 0) {
      return typeFieldNames.map((key) => ({ key, value: '' }));
    }
    return [{ key: '', value: '' }];
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      price: 0,
      comparePrice: null,
      cost: null,
      stock: 0,
      attributes: {},
      images: [],
      isActive: true,
    });
    setAttributes(buildDefaultAttributes());
    setEditingVariant(null);
  };

  const handleOpenDialog = (variant?: any) => {
    if (variant) {
      setEditingVariant(variant);
      setFormData({
        sku: variant.sku || '',
        price: variant.price || 0,
        comparePrice: variant.comparePrice || null,
        cost: variant.cost || null,
        stock: variant.stock || 0,
        attributes: variant.attributes || {},
        images: variant.images || [],
        isActive: variant.isActive !== undefined ? variant.isActive : true,
      });
      // Convert attributes to array for editing
      const attrs = variant.attributes || {};
      const attrArray = Object.entries(attrs).map(([key, value]) => ({ key, value: String(value) }));
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

  const handleAddAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const handleSubmit = async () => {
    // Convert attributes to object
    const attributesObj = attributes.reduce((acc, attr) => {
      if (attr.key && attr.value) {
        acc[attr.key] = attr.value;
      }
      return acc;
    }, {} as Record<string, string>);

    // Client-side pre-checks — the backend enforces both authoritatively,
    // this just gives immediate feedback instead of a round trip.
    const canonical = canonicalizeAttributes(attributesObj);
    if (canonical) {
      const isDuplicateCombo = variants.some(
        (v) => v.id !== editingVariant?.id && canonicalizeAttributes(v.attributes || {}) === canonical,
      );
      if (isDuplicateCombo) {
        toast.error('A variant with this exact combination of options already exists for this product.');
        return;
      }
    }
    if (formData.sku.trim()) {
      const isDuplicateSku = variants.some(
        (v) => v.id !== editingVariant?.id && v.sku?.toLowerCase() === formData.sku.trim().toLowerCase(),
      );
      if (isDuplicateSku) {
        toast.error(`SKU "${formData.sku.trim()}" is already used by another variant.`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        sku: formData.sku || undefined,
        price: formData.price,
        comparePrice: formData.comparePrice ?? undefined,
        cost: formData.cost ?? undefined,
        stock: formData.stock,
        attributes: attributesObj,
        images: formData.images,
        isActive: formData.isActive,
      };

      if (editingVariant) {
        await api.patch(`/products/${productId}/variants/${editingVariant.id}`, payload);
        toast.success('Variant updated successfully');
      } else {
        await api.post(`/products/${productId}/variants`, payload);
        toast.success('Variant created successfully');
      }

      onUpdate();
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save variant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${productId}/variants/${deleteTarget.id}`);
      toast.success('Variant deleted successfully');
      onUpdate();
    } catch (error: any) {
      // The backend blocks deletion with a clear message when the variant
      // has been purchased in an existing order — surface it as-is rather
      // than a generic failure toast.
      toast.error(error.response?.data?.message || 'Failed to delete variant');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleVariantStatus = async (variantId: number, isActive: boolean) => {
    try {
      await api.patch(`/products/${productId}/variants/${variantId}`, { isActive: !isActive });
      toast.success('Variant status updated');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to update variant status');
    }
  };

  const openGenerator = () => {
    setGeneratorRows(
      typeFieldNames.length > 0
        ? typeFieldNames.map((key) => ({ key, valuesInput: '' }))
        : [{ key: '', valuesInput: '' }],
    );
    setGeneratorBasePrice(0);
    setGeneratorBaseStock(0);
    setGeneratorPreview([]);
    setGeneratorStep('input');
    setIsGeneratorOpen(true);
  };

  const closeGenerator = () => setIsGeneratorOpen(false);

  const handleAddGeneratorRow = () => {
    setGeneratorRows([...generatorRows, { key: '', valuesInput: '' }]);
  };

  const handleRemoveGeneratorRow = (index: number) => {
    setGeneratorRows(generatorRows.filter((_, i) => i !== index));
  };

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
      const sku = `VAR-${productId}-${Object.values(combo).map(slugifyVariantValue).join('-')}`;
      return { attributes: combo, sku, isDuplicate, selected: !isDuplicate };
    });

    setGeneratorPreview(preview);
    setGeneratorStep('preview');
  };

  const handleToggleGeneratorItem = (index: number) => {
    setGeneratorPreview((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)),
    );
  };

  const handleConfirmGenerate = async () => {
    const toCreate = generatorPreview.filter((item) => item.selected && !item.isDuplicate);
    if (toCreate.length === 0) {
      toast.error('Select at least one combination to create.');
      return;
    }

    setIsGenerating(true);
    let succeeded = 0;
    let failed = 0;
    for (const item of toCreate) {
      try {
        await api.post(`/products/${productId}/variants`, {
          sku: item.sku,
          price: generatorBasePrice,
          stock: generatorBaseStock,
          attributes: item.attributes,
          images: [],
          isActive: true,
        });
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
    setIsGenerating(false);

    if (succeeded > 0) {
      toast.success(`Created ${succeeded} variant${succeeded === 1 ? '' : 's'}.`);
      onUpdate();
    }
    if (failed > 0) {
      toast.error(`${failed} combination${failed === 1 ? '' : 's'} could not be created — they may already exist.`);
    }
    if (succeeded > 0 && failed === 0) {
      closeGenerator();
    }
  };

  const displayVariants: DisplayVariant[] = variants.map((variant) => ({
    key: variant.id,
    sku: variant.sku,
    skuPlaceholder: '-',
    attributes: variant.attributes || {},
    price: variant.price,
    stock: variant.stock,
    images: variant.images || [],
    isActive: variant.isActive,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Variants</CardTitle>
            <CardDescription>
              Manage product variants. Fields from the assigned product type are used on the storefront.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openGenerator}>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Variants
            </Button>
            <Button onClick={() => handleOpenDialog()}>
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
          emptyHint="Add more variants here, or manage existing ones"
          onEdit={(key) => handleOpenDialog(variants.find((v) => v.id === key))}
          onToggleActive={(key) => {
            const variant = variants.find((v) => v.id === key);
            if (variant) handleToggleVariantStatus(variant.id, variant.isActive);
          }}
          onDelete={(key) => setDeleteTarget(variants.find((v) => v.id === key))}
        />
      </CardContent>

      {/* Add/Edit Variant Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add New Variant'}</DialogTitle>
            <DialogDescription>
              Configure variant options for this product
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  placeholder="Variant SKU"
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
                <Label>Price ($)</Label>
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

            {/* Images */}
            <div className="space-y-2">
              <Label>Variant Images</Label>
              <ImageUpload
                images={formData.images}
                setImages={(images) => setFormData({ ...formData, images })}
                maxImages={5}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Saving...' : editingVariant ? 'Update Variant' : 'Add Variant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Variant"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${formatAttributesLabel(deleteTarget.attributes) || deleteTarget.sku || 'this variant'}"? This cannot be undone. If it has been purchased in any order, deletion will be blocked — deactivate it instead.`
            : ''
        }
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
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
        isSubmitting={isGenerating}
        confirmVerb="Create"
        resultVerbPastTense="created"
        duplicateLabel="Already exists"
      />
    </Card>
  );
}
