'use client';

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Edit,
  Trash2,
  Plus,
  GripVertical,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Category {
  id: number;
  name: string;
  nameTetum: string | null;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  parentId: number | null;
  children?: Category[];
  productCount?: number;
}

interface CategoriesTreeProps {
  categories: Category[];
  onEdit: (category: Category | null) => void;
  onRefresh: () => void;
}

function CategoryNode({
  category,
  level,
  onEdit,
  onRefresh,
}: {
  category: Category;
  level: number;
  onEdit: (category: Category) => void;
  onRefresh: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChildren = category.children && category.children.length > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/categories/${category.id}`);
      toast.success(`Category "${category.name}" deleted successfully`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleFeatured = async () => {
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

  return (
    <>
      <div
        className={`flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg group ${
          level > 0 ? 'ml-6' : ''
        }`}
        style={{ marginLeft: level * 24 }}
      >
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => hasChildren && setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-6" />
            )}
          </button>
          {isExpanded || !hasChildren ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500" />
          )}
          <span className="font-medium">{category.name}</span>
          {category.nameTetum && (
            <span className="text-sm text-muted-foreground">
              ({category.nameTetum})
            </span>
          )}
          <Badge variant="outline" className="text-xs">
            {category.productCount || 0} products
          </Badge>
          {!category.isActive && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
          {category.isFeatured && (
            <Badge variant="default" className="text-xs bg-yellow-500">
              Featured
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFeatured}
          >
            <Star className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={hasChildren || (category.productCount || 0) > 0}
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Category"
        description={`Are you sure you want to delete "${category.name}"? ${
          hasChildren
            ? 'This category has subcategories. Please delete or reassign them first.'
            : (category.productCount || 0) > 0
            ? `This category has ${category.productCount} products. Please reassign them first.`
            : 'This action cannot be undone.'
        }`}
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={isDeleting}
        disabled={hasChildren || (category.productCount || 0) > 0}
      />
    </>
  );
}

// Star icon component
function Star({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

export function CategoriesTree({ categories, onEdit, onRefresh }: CategoriesTreeProps) {
  // Build tree structure
  const buildTree = (items: Category[], parentId: number | null = null): Category[] => {
    return items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
      }));
  };

  const treeData = buildTree(categories);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    // Only top-level categories are draggable here (children render as
    // plain CategoryNode, not wrapped in Draggable) — so this only ever
    // needs to recompute order among treeData's siblings, not the whole tree.
    const reordered = Array.from(treeData);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const orders = reordered.map((category, index) => ({ id: category.id, order: index }));

    try {
      // :id in the path is unused by the backend (the whole `orders` array
      // in the body is what actually gets applied) — any real category id
      // satisfies the route.
      await api.post(`/categories/${orders[0].id}/reorder`, { orders });
      toast.success('Categories reordered');
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reorder categories');
    }
  };

  if (treeData.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No Categories</h3>
        <p className="text-muted-foreground mb-4">
          Get started by creating your first category
        </p>
        <Button onClick={() => onEdit(null)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="categories">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {treeData.map((category, index) => (
              <Draggable key={category.id} draggableId={category.id.toString()} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    style={provided.draggableProps.style as any}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <CategoryNode
                      category={category}
                      level={0}
                      onEdit={onEdit}
                      onRefresh={onRefresh}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}