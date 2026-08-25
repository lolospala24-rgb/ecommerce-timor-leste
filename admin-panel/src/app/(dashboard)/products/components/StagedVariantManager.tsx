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
import toast from 'react-hot-toast';

// Mirrors VariantManager's canonicalization exactly, so the "this
// combination already exists" check behaves identically whether the
// product already exists (VariantManager, live API) or is still being
// created (here, purely in-memory against the staged array).
function canonicalizeAttributes(attrs: Record<string, string>): string {
  return Object.keys(attrs)
    .filter((k) => k.trim())
    .sort()
    .map((k) => `${k.trim().toLowerCase()}=${String(attrs[k]).trim().toLowerCase()}`)
    .join('|');
}

function formatAttributesLabel(attrs: Record<string, string> | undefined | null): string {
  if (!attrs) return '';
  return Object.values(attrs).filter(Boolean).join(' / ');
}

const MANY_COMBINATIONS_WARNING_THRESHOLD = 50;

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
  const [generatorRows, setGeneratorRows] = useState<{ key: string; valuesInput: string }[]>([
    { key: '', valuesInput: '' },
  ]);
  const [generatorBasePrice, setGeneratorBasePrice] = useState(0);
  const [generatorBaseStock, setGeneratorBaseStock] = useState(0);
  const [generatorPreview, setGeneratorPreview] = useState<
    { attributes: Record<string, string>; isDuplicate: boolean; selected: boolean }[]
  >([]);

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
    const rows = generatorRows
      .map((row) => ({
        key: row.key.trim(),
        values: Array.from(new Set(row.valuesInput.split(',').map((v) => v.trim()).filter(Boolean))),
      }))
      .filter((row) => row.key && row.values.length > 0);

    if (rows.length === 0) {
      toast.error('Enter at least one attribute with at least one value.');
      return;
    }

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
        if (seenInBatch.has(canonical)) return false;
        seenInBatch.add(canonical);
        return true;
      })
      .map((combo) => {
        const canonical = canonicalizeAttributes(combo);
        return { attributes: combo, isDuplicate: existingCanonical.has(canonical), selected: !existingCanonical.has(canonical) };
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

  const selectedGeneratorCount = generatorPreview.filter((item) => item.selected && !item.isDuplicate).length;

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

        {variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p>No variants yet</p>
            <p className="text-sm">Add variants to offer different options for this product (optional)</p>
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
                <TableRow key={variant.tempId}>
                  <TableCell className="font-mono text-sm">{variant.sku || '(auto)'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(variant.attributes).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>${variant.price.toFixed(2)}</TableCell>
                  <TableCell>{variant.stock}</TableCell>
                  <TableCell>
                    {variant.images.length > 0 ? (
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenDialog(variant)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleToggleActive(variant.tempId)}>
                        {variant.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
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

            <div className="space-y-2">
              <Label>Attributes</Label>
              <div className="space-y-2">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex gap-2">
                    {typeFieldNames.length > 0 ? (
                      <Select value={attr.key || undefined} onValueChange={(value) => handleAttributeChange(index, 'key', value)}>
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
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAttribute(index)}
                      disabled={attributes.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddAttribute}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Attribute
                </Button>
              </div>
            </div>

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

      <Dialog open={isGeneratorOpen} onOpenChange={(open) => !open && closeGenerator()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Variants</DialogTitle>
            <DialogDescription>
              {generatorStep === 'input'
                ? 'List each attribute and its possible values — every combination will be previewed before anything is added.'
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
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveGeneratorRow(index)}
                      disabled={generatorRows.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddGeneratorRow}>
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
                  <p className="text-xs text-muted-foreground">Defaults to 0 so nothing becomes sellable until you set real stock.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {generatorPreview.length > MANY_COMBINATIONS_WARNING_THRESHOLD && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>This will add {generatorPreview.length} variants. Double-check your attribute values before continuing.</span>
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
                      {item.isDuplicate && <Badge variant="outline" className="text-xs">Already staged</Badge>}
                    </div>
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
              <Button type="button" variant="outline" onClick={() => setGeneratorStep('input')}>
                Back
              </Button>
            )}
            <Button type="button" variant="outline" onClick={closeGenerator}>
              Cancel
            </Button>
            {generatorStep === 'input' ? (
              <Button type="button" onClick={handlePreviewCombinations}>
                Preview Combinations
              </Button>
            ) : (
              <Button type="button" onClick={handleConfirmGenerate} disabled={selectedGeneratorCount === 0}>
                {`Add ${selectedGeneratorCount} Variant${selectedGeneratorCount === 1 ? '' : 's'}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
