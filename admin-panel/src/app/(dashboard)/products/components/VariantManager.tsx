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
import { ImageUpload } from '@/components/shared/ImageUpload';
import { Plus, Trash2, Edit, GripVertical, X, Grid3x3, EyeOff, Eye } from 'lucide-react';
import { fieldsToNameList } from '@/lib/productType';
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
    setIsLoading(true);
    try {
      // Convert attributes to object
      const attributesObj = attributes.reduce((acc, attr) => {
        if (attr.key && attr.value) {
          acc[attr.key] = attr.value;
        }
        return acc;
      }, {} as Record<string, string>);

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
        await api.put(`/products/${productId}/variants/${editingVariant.id}`, payload);
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

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;

    try {
      await api.delete(`/products/${productId}/variants/${variantId}`);
      toast.success('Variant deleted successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete variant');
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
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Variant
          </Button>
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
                        onClick={() => handleDeleteVariant(variant.id)}
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
    </Card>
  );
}