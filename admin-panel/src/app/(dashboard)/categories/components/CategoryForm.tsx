'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/shared/ImageUpload';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameTetum: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  order: z.number().int().min(0),
  slug: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: any;
  categories: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function CategoryForm({
  initialData,
  categories,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const [image, setImage] = useState<string>(initialData?.image || '');
  const [isLoading, setIsLoading] = useState(false);

  const getInitialValues = (data?: any): CategoryFormData => ({
    name: data?.name ?? '',
    nameTetum: data?.nameTetum ?? '',
    description: data?.description ?? '',
    image: data?.image ?? '',
    parentId: data?.parentId != null ? data.parentId.toString() : 'none',
    isActive: data?.isActive ?? true,
    isFeatured: data?.isFeatured ?? false,
    order: data?.order ?? 0,
    slug: data?.slug ?? '',
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: getInitialValues(initialData),
  });

  const parentId = watch('parentId');

  useEffect(() => {
    reset(getInitialValues(initialData));
    setImage(initialData?.image || '');
  }, [initialData, reset]);

  const onSubmit = async (data: CategoryFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        image,
        parentId: data.parentId && data.parentId !== 'none' ? parseInt(data.parentId) : null,
      };

      if (initialData?.id) {
        await api.patch(`/categories/${initialData.id}`, payload);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out self and children from parent options
  const getAvailableParents = () => {
    if (!initialData) return categories;
    
    const filterChildren = (categoryId: number): number[] => {
      const children = categories.filter(c => c.parentId === categoryId);
      return children.flatMap(c => [c.id, ...filterChildren(c.id)]);
    };
    
    const excludedIds = [initialData.id, ...filterChildren(initialData.id)];
    return categories.filter(c => !excludedIds.includes(c.id));
  };

  const availableParents = getAvailableParents();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Name (Portuguese) *</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Name (Tetun)</Label>
            <Input {...register('nameTetum')} />
          </div>

          <div>
            <Label>Slug (URL)</Label>
            <Input {...register('slug')} placeholder="auto-generated if empty" />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to auto-generate from name
            </p>
          </div>

          <div>
            <Label>Parent Category</Label>
            <Select
              value={parentId ?? 'none'}
              onValueChange={(value) => setValue('parentId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No Parent (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent (Top Level)</SelectItem>
                {availableParents.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {'— '.repeat(category.level || 0)}
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Order</Label>
            <Input
              type="number"
              {...register('order', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower numbers appear first
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Description</Label>
            <Textarea rows={4} {...register('description')} />
          </div>

          <div>
            <Label>Category Image</Label>
            <ImageUpload
              images={image ? [image] : []}
              setImages={(images) => setImage(images[0] || '')}
              maxImages={1}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended size: 400x400px
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={watch('isActive')}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Featured on Homepage</Label>
            <Switch
              checked={watch('isFeatured')}
              onCheckedChange={(checked) => setValue('isFeatured', checked)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : initialData ? (
            'Update Category'
          ) : (
            'Create Category'
          )}
        </Button>
      </div>
    </form>
  );
}