'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Eye, Star, StarOff } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Category {
  id: number;
  name: string;
  nameTetum: string | null;
  slug: string;
  parentId: number | null;
  parent?: {
    id: number;
    name: string;
  };
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  productCount?: number;
  createdAt: string;
}

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onRefresh: () => void;
}

export function CategoryTable({ categories, onEdit, onRefresh }: CategoryTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setIsLoading(true);
    try {
      await api.delete(`/categories/${selectedCategory.id}`);
      toast.success(`Category "${selectedCategory.name}" deleted successfully`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
    }
  };

  const handleToggleFeatured = async (category: Category) => {
    try {
      await api.post(`/categories/${category.id}/featured`, {
        isFeatured: !category.isFeatured,
      });
      toast.success(
        category.isFeatured
          ? 'Category removed from featured'
          : 'Category added to featured'
      );
      onRefresh();
    } catch (error) {
      toast.error('Failed to update featured status');
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await api.patch(`/categories/${category.id}`, {
        isActive: !category.isActive,
      });
      toast.success(
        category.isActive
          ? 'Category deactivated'
          : 'Category activated'
      );
      onRefresh();
    } catch (error) {
      toast.error('Failed to update category status');
    }
  };

  const getParentName = (parentId: number | null, categories: Category[]): string => {
    if (!parentId) return '-';
    const parent = categories.find(c => c.id === parentId);
    return parent?.name || '-';
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                No categories found
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{category.name}</span>
                    {category.nameTetum && (
                      <p className="text-xs text-muted-foreground">
                        {category.nameTetum}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{category.slug}</TableCell>
                <TableCell>{getParentName(category.parentId, categories)}</TableCell>
                <TableCell>{category.productCount || 0}</TableCell>
                <TableCell>
                  <Badge variant={category.isActive ? 'default' : 'secondary'}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {category.isFeatured ? (
                    <Badge className="bg-yellow-500">Featured</Badge>
                  ) : (
                    <Badge variant="outline">Not Featured</Badge>
                  )}
                </TableCell>
                <TableCell>{category.order}</TableCell>
                <TableCell className="text-sm">
                  {new Date(category.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(category)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleFeatured(category)}>
                        {category.isFeatured ? (
                          <>
                            <StarOff className="mr-2 h-4 w-4" />
                            Remove Featured
                          </>
                        ) : (
                          <>
                            <Star className="mr-2 h-4 w-4" />
                            Make Featured
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(category)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {category.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedCategory(category);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Category"
        description={`Are you sure you want to delete "${selectedCategory?.name}"? ${
          (selectedCategory?.productCount || 0) > 0
            ? `This category has ${selectedCategory?.productCount} products. Please reassign them first.`
            : 'This action cannot be undone.'
        }`}
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={isLoading}
        disabled={(selectedCategory?.productCount || 0) > 0}
      />
    </>
  );
}