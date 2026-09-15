'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Wand2, Pencil, Trash2, Loader2, X, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  useCreateVariant,
  useDeleteVariant,
  useProductVariants,
  useToggleVariantStatus,
  useUpdateVariant,
} from '@/hooks/useProductVariants';
import {
  canonicalizeAttributes,
  formatAttributesLabel,
  generateAttributeCombinations,
  slugifyVariantValue,
  type GeneratorAttributeRow,
} from '@/lib/variantAttributes';
import type { ProductVariant } from '@/types/product.types';

const emptyForm = {
  sku: '',
  price: '',
  comparePrice: '',
  stock: '',
  isActive: true,
};

export function VariantManager({ productId, baseSku }: { productId: number; baseSku?: string | null }) {
  const { data: variants, isLoading } = useProductVariants(productId);
  const createVariant = useCreateVariant(productId);
  const updateVariant = useUpdateVariant(productId);
  const deleteVariant = useDeleteVariant(productId);
  const toggleStatus = useToggleVariantStatus(productId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [attrRows, setAttrRows] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);

  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorStep, setGeneratorStep] = useState<'input' | 'preview'>('input');
  const [generatorRows, setGeneratorRows] = useState<GeneratorAttributeRow[]>([{ key: '', valuesInput: '' }]);
  const [generatorPrice, setGeneratorPrice] = useState('');
  const [generatorStock, setGeneratorStock] = useState('');
  const [generatorPreview, setGeneratorPreview] = useState<Record<string, string>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setAttrRows([{ key: '', value: '' }]);
    setDialogOpen(true);
  };

  const openEdit = (variant: ProductVariant) => {
    setEditing(variant);
    setForm({
      sku: variant.sku || '',
      price: String(variant.price ?? ''),
      comparePrice: variant.comparePrice != null ? String(variant.comparePrice) : '',
      stock: String(variant.stock ?? ''),
      isActive: variant.isActive,
    });
    // Some older variants have a single comma-joined key like
    // "Color,Size,Storage" (from a form that let a comma slip into the
    // attribute-name field instead of the value field) — split those into
    // one row per name so the seller can see and fix each one separately,
    // rather than editing them as one garbled field. The value is only
    // carried onto the first split row; the rest start blank since there's
    // no way to know which original value belonged to which name.
    const rows = Object.entries(variant.attributes || {}).flatMap(([key, value], entryIdx) => {
      const names = key.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length <= 1) return [{ key, value }];
      return names.map((name, i) => ({ key: name, value: entryIdx === 0 && i === 0 ? value : '' }));
    });
    setAttrRows(rows.length > 0 ? rows : [{ key: '', value: '' }]);
    setDialogOpen(true);
  };

  const buildAttributesObject = () =>
    attrRows.reduce<Record<string, string>>((acc, row) => {
      if (row.key.trim()) acc[row.key.trim()] = row.value.trim();
      return acc;
    }, {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const attributes = buildAttributesObject();
    const canonical = canonicalizeAttributes(attributes);
    const duplicate = (variants || []).some(
      (v) => v.id !== editing?.id && canonicalizeAttributes(v.attributes || {}) === canonical,
    );
    if (Object.keys(attributes).length > 0 && duplicate) {
      toast.error('A variant with this exact attribute combination already exists');
      return;
    }

    const payload = {
      sku: form.sku.trim() || undefined,
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
      stock: Number(form.stock),
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      isActive: form.isActive,
    };

    if (editing) {
      updateVariant.mutate({ variantId: editing.id, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createVariant.mutate(payload, {
        onSuccess: () => {
          toast.success('Variant created');
          setDialogOpen(false);
        },
      });
    }
  };

  // --- Generate Variants wizard ---
  const openGenerator = () => {
    setGeneratorStep('input');
    setGeneratorRows([{ key: '', valuesInput: '' }]);
    setGeneratorPrice('');
    setGeneratorStock('');
    setGeneratorPreview([]);
    setGeneratorOpen(true);
  };

  const buildPreview = () => {
    const combos = generateAttributeCombinations(generatorRows);
    if (combos.length === 0) {
      toast.error('Enter at least one attribute with values');
      return;
    }
    const existing = new Set((variants || []).map((v) => canonicalizeAttributes(v.attributes || {})));
    const fresh = combos.filter((c) => !existing.has(canonicalizeAttributes(c)));
    if (fresh.length === 0) {
      toast.error('All of those combinations already exist as variants');
      return;
    }
    setGeneratorPreview(fresh);
    setGeneratorStep('preview');
  };

  const confirmGenerate = async () => {
    setIsGenerating(true);
    let created = 0;
    let failed = 0;
    for (const combo of generatorPreview) {
      const suggestedSku = baseSku
        ? `${baseSku}-${Object.values(combo).map(slugifyVariantValue).join('-')}`
        : undefined;
      try {
        await createVariant.mutateAsync({
          sku: suggestedSku,
          price: Number(generatorPrice) || 0,
          stock: Number(generatorStock) || 0,
          attributes: combo,
        });
        created += 1;
      } catch {
        failed += 1;
      }
    }
    setIsGenerating(false);
    setGeneratorOpen(false);
    if (created > 0) toast.success(`${created} variant(s) created`);
    if (failed > 0) toast.error(`${failed} variant(s) failed`);
  };

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Variants</h3>
          <p className="text-sm text-muted-foreground">Different price/stock combinations of this product (size, color, ...).</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openGenerator}>
            <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Generate Variants
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Variant
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !variants?.length ? (
        <EmptyState icon={Boxes} title="No variants yet" description="Add variants if this product comes in different sizes, colors, or other options." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant.id}>
                <TableCell className="text-sm">{formatAttributesLabel(variant.attributes) || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{variant.sku}</TableCell>
                <TableCell className="text-sm tabular-nums">${variant.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={variant.stock === 0 ? 'destructive' : 'outline'}>{variant.stock} units</Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleStatus.mutate(variant.id)}
                    className="inline-flex"
                    title={variant.isActive ? 'Click to deactivate' : 'Click to activate'}
                  >
                    <Badge variant={variant.isActive ? 'default' : 'secondary'}>{variant.isActive ? 'Active' : 'Inactive'}</Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(variant)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(variant)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
            <DialogDescription>Set the attributes, price and stock for this variant.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Attributes</Label>
              <p className="text-xs text-muted-foreground">
                One attribute name per row (e.g. &quot;Color&quot;) — use &quot;+ Add attribute&quot; below for more, not commas in this field.
              </p>
              {attrRows.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="Name, e.g. Color"
                    value={row.key}
                    onChange={(e) => {
                      // A comma here almost always means the seller meant
                      // "+ Add attribute" (a separate row) instead — strip it
                      // rather than silently saving something like
                      // "Color,Size" as one literal attribute name.
                      const sanitized = e.target.value.replace(/,/g, '');
                      const next = [...attrRows];
                      next[idx] = { ...next[idx], key: sanitized };
                      setAttrRows(next);
                    }}
                  />
                  <Input
                    placeholder="e.g. Red"
                    value={row.value}
                    onChange={(e) => {
                      const next = [...attrRows];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setAttrRows(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => setAttrRows(attrRows.filter((_, i) => i !== idx))}
                    disabled={attrRows.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setAttrRows([...attrRows, { key: '', value: '' }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add attribute
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="v-sku">SKU (optional)</Label>
                <Input id="v-sku" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-price">Price *</Label>
                <Input
                  id="v-price"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-compare">Compare-at price</Label>
                <Input
                  id="v-compare"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.comparePrice}
                  onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-stock">Stock *</Label>
                <Input
                  id="v-stock"
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="v-active">Active</Label>
              <Switch id="v-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVariant.isPending || updateVariant.isPending}>
                {createVariant.isPending || updateVariant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate variants wizard */}
      <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Generate Variants</DialogTitle>
            <DialogDescription>
              {generatorStep === 'input'
                ? 'Define attributes and comma-separated values — every combination will be created.'
                : `Review ${generatorPreview.length} new variant(s) before creating them.`}
            </DialogDescription>
          </DialogHeader>

          {generatorStep === 'input' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {generatorRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Attribute (e.g. Size)"
                      value={row.key}
                      onChange={(e) => {
                        const next = [...generatorRows];
                        next[idx] = { ...next[idx], key: e.target.value.replace(/,/g, '') };
                        setGeneratorRows(next);
                      }}
                      className="w-40"
                    />
                    <Input
                      placeholder="Values, comma-separated (e.g. S, M, L)"
                      value={row.valuesInput}
                      onChange={(e) => {
                        const next = [...generatorRows];
                        next[idx] = { ...next[idx], valuesInput: e.target.value };
                        setGeneratorRows(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => setGeneratorRows(generatorRows.filter((_, i) => i !== idx))}
                      disabled={generatorRows.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setGeneratorRows([...generatorRows, { key: '', valuesInput: '' }])}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add attribute
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Price for all</Label>
                  <Input type="number" min="0.01" step="0.01" value={generatorPrice} onChange={(e) => setGeneratorPrice(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Stock for all</Label>
                  <Input type="number" min="0" step="1" value={generatorStock} onChange={(e) => setGeneratorStock(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setGeneratorOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={buildPreview} disabled={!generatorPrice || !generatorStock}>
                  Preview
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Combination</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatorPreview.map((combo, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{formatAttributesLabel(combo)}</TableCell>
                        <TableCell className="text-sm tabular-nums">${Number(generatorPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{generatorStock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setGeneratorStep('input')} disabled={isGenerating}>
                  Back
                </Button>
                <Button type="button" onClick={confirmGenerate} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create {generatorPreview.length} Variant(s)
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete variant?"
        description={`This removes "${deleteTarget ? formatAttributesLabel(deleteTarget.attributes) || deleteTarget.sku : ''}". Variants with order history can't be deleted.`}
        confirmText="Delete"
        isLoading={deleteVariant.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteVariant.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
