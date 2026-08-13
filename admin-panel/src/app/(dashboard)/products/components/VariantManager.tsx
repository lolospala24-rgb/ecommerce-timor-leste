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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Plus, Trash2, Edit, X, Grid3x3, EyeOff, Eye, Wand2, AlertTriangle } from 'lucide-react';
import { fieldsToNameList } from '@/lib/productType';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// Order-independent, case-insensitive canonicalization — mirrors the
// backend's duplicate-combination check exactly, so the admin sees the
// same "this combination already exists" verdict before submitting that
// they'd get from the API, instead of finding out only after a round trip.
function canonicalizeAttributes(attrs: Record<string, string>): string {
  return Object.keys(attrs)
    .filter((k) => k.trim())
    .sort()
    .map((k) => `${k.trim().toLowerCase()}=${String(attrs[k]).trim().toLowerCase()}`)
    .join('|');
}

const MANY_COMBINATIONS_WARNING_THRESHOLD = 50;

function formatAttributesLabel(attrs: Record<string, string> | undefined | null): string {
  if (!attrs) return '';
  return Object.values(attrs).filter(Boolean).join(' / ');
}

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
  const [generatorRows, setGeneratorRows] = useState<{ key: string; valuesInput: string }[]>([
    { key: '', valuesInput: '' },
  ]);
  const [generatorBasePrice, setGeneratorBasePrice] = useState(0);
  const [generatorBaseStock, setGeneratorBaseStock] = useState(0);
  const [generatorPreview, setGeneratorPreview] = useState<
    { attributes: Record<string, string>; sku: string; isDuplicate: boolean; selected: boolean }[]
  >([]);
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
    const newAttributes = attributes.filter((_, i) => i !== index);
    setAttributes(newAttributes);
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

  const closeGenerator = () => {
    setIsGeneratorOpen(false);
  };

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

  const slugifyValue = (value: string) =>
    value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'X';

  const handlePreviewCombinations = () => {
    const rows = generatorRows
      .map((row) => ({
        key: row.key.trim(),
        values: Array.from(
          new Set(
            row.valuesInput
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
          ),
        ),
      }))
      .filter((row) => row.key && row.values.length > 0);

    if (rows.length === 0) {
      toast.error('Enter at least one attribute with at least one value.');
      return;
    }

    // Cartesian product across all attribute rows.
    let combinations: Record<string, string>[] = [{}];
    for (const row of rows) {
      const next: Record<string, string>[] = [];
      for (const existing of combinations) {
        for (const value of row.values) {
          next.push({ ...existing, [row.key]: value });
        }
      }
      combinations = next;
    }

    const existingCanonical = new Set(variants.map((v) => canonicalizeAttributes(v.attributes || {})));
    const seenInBatch = new Set<string>();

    const preview = combinations
      .filter((combo) => {
        const canonical = canonicalizeAttributes(combo);
        if (seenInBatch.has(canonical)) return false; // same value entered twice in one row
        seenInBatch.add(canonical);
        return true;
      })
      .map((combo) => {
        const canonical = canonicalizeAttributes(combo);
        const isDuplicate = existingCanonical.has(canonical);
        const sku = `VAR-${productId}-${Object.values(combo).map(slugifyValue).join('-')}`;
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

  const selectedGeneratorCount = generatorPreview.filter((item) => item.selected && !item.isDuplicate).length;

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
              <span className="text-muted-foreground">
                {' '}
                · Fields: {typeFieldNames.join(', ')}
              </span>
            )}
          </div>
        )}

        {variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p>No variants yet</p>
            <p className="text-sm">Add variants to offer different options for this product</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Attributes</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Images</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-mono text-sm">{variant.sku || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {variant.attributes && Object.entries(variant.attributes).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>${variant.price.toFixed(2)}</TableCell>
                  <TableCell>{variant.stock}</TableCell>
                  <TableCell>
                    {variant.images && variant.images.length > 0 ? (
                      <Badge variant="outline">{variant.images.length} images</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No images</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant.isActive ? 'default' : 'secondary'}>
                      {variant.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(variant)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleVariantStatus(variant.id, variant.isActive)}
                      >
                        {variant.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteTarget(variant)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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

            {/* Attributes */}
            <div className="space-y-2">
              <Label>Attributes</Label>
              <div className="space-y-2">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex gap-2">
                    {typeFieldNames.length > 0 ? (
                      <Select
                        value={attr.key || undefined}
                        onValueChange={(value) => handleAttributeChange(index, 'key', value)}
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
                        onChange={(e) => handleAttributeChange(index, 'key', e.target.value)}
                        className="flex-1"
                      />
                    )}
                    <Input
                      placeholder="Value (e.g., Red)"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAttribute(index)}
                      disabled={attributes.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddAttribute}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Attribute
                </Button>
              </div>
            </div>

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

      {/* Generate Variants — attribute values -> preview combinations -> bulk create */}
      <Dialog open={isGeneratorOpen} onOpenChange={(open) => !open && closeGenerator()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Variants</DialogTitle>
            <DialogDescription>
              {generatorStep === 'input'
                ? 'List each attribute and its possible values — every combination will be previewed before anything is created.'
                : 'Review the combinations below. Existing ones are shown grayed out and skipped.'}
            </DialogDescription>
          </DialogHeader>

          {generatorStep === 'input' ? (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                {generatorRows.map((row, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Attribute (e.g. Color)"
                      value={row.key}
                      onChange={(e) => handleGeneratorRowChange(index, 'key', e.target.value)}
                      className="w-1/3"
                    />
                    <Textarea
                      placeholder="Values, comma-separated (e.g. Black, White, Red)"
                      value={row.valuesInput}
                      onChange={(e) => handleGeneratorRowChange(index, 'valuesInput', e.target.value)}
                      className="flex-1 min-h-[2.5rem]"
                      rows={1}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveGeneratorRow(index)}
                      disabled={generatorRows.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddGeneratorRow}>
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
                    value={generatorBasePrice}
                    onChange={(e) => setGeneratorBasePrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Stock</Label>
                  <Input
                    type="number"
                    value={generatorBaseStock}
                    onChange={(e) => setGeneratorBaseStock(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to 0 so nothing becomes sellable until you set real stock.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {generatorPreview.length > MANY_COMBINATIONS_WARNING_THRESHOLD && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    This will create {generatorPreview.length} variants. Double-check your attribute values before continuing.
                  </span>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto space-y-1.5 rounded-lg border p-2">
                {generatorPreview.map((item, index) => (
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
                        onChange={() => handleToggleGeneratorItem(index)}
                      />
                      <span>{formatAttributesLabel(item.attributes)}</span>
                      {item.isDuplicate && (
                        <Badge variant="outline" className="text-xs">Already exists</Badge>
                      )}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                  </label>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                {selectedGeneratorCount} of {generatorPreview.length} combinations selected.
              </p>
            </div>
          )}

          <DialogFooter>
            {generatorStep === 'preview' && (
              <Button variant="outline" onClick={() => setGeneratorStep('input')} disabled={isGenerating}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={closeGenerator} disabled={isGenerating}>
              Cancel
            </Button>
            {generatorStep === 'input' ? (
              <Button onClick={handlePreviewCombinations}>Preview Combinations</Button>
            ) : (
              <Button onClick={handleConfirmGenerate} disabled={isGenerating || selectedGeneratorCount === 0}>
                {isGenerating ? 'Creating...' : `Create ${selectedGeneratorCount} Variant${selectedGeneratorCount === 1 ? '' : 's'}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}