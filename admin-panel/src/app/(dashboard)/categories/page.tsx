'use client';

import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { CategoriesTree } from './components/CategoriesTree';
import { CategoryTable } from './components/CategoryTable';
import { CategoryForm } from './components/CategoryForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Download, FolderTree, List } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function CategoriesPage() {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const { data, isLoading, refetch } = useCategories({ page: 1, limit: 100 });

  const handleExport = async () => {
    try {
      // api's response interceptor already unwraps to response.data, so
      // this resolves directly to the Blob — not { data: Blob }. (Was
      // previously a plain `fetch()` too, which also never sent the
      // httpOnly auth cookie without an explicit credentials: 'include'.)
      const blob = await api.get<Blob>('/categories/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob as unknown as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categories_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Categories exported successfully');
    } catch (error) {
      toast.error('Failed to export categories');
    }
  };

  const handleEdit = (category: any | null) => {
    setEditingCategory(category);
    setShowCreateDialog(true);
  };

  const handleDialogClose = () => {
    setShowCreateDialog(false);
    setEditingCategory(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories Management</h1>
          <p className="text-muted-foreground">
            Manage product categories and subcategories
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('tree')}
            >
              <FolderTree className="h-4 w-4 mr-1" />
              Tree View
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4 mr-1" />
              Table View
            </Button>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => {
            setEditingCategory(null);
            setShowCreateDialog(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Organize products with categories and subcategories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : viewMode === 'tree' ? (
            <CategoriesTree
              categories={data?.data || []}
              onEdit={handleEdit}
              onRefresh={refetch}
            />
          ) : (
            <CategoryTable
              categories={data?.data || []}
              onEdit={handleEdit}
              onRefresh={refetch}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category information below'
                : 'Fill in the details to create a new category'}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            initialData={editingCategory}
            categories={data?.data || []}
            onSuccess={handleDialogClose}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}