'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { GripVertical, Pencil, Trash2, Plus, Eye, LayoutGrid, ExternalLink } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import {
  useQuickMenuItems,
  useUpdateQuickMenuItem,
  useDeleteQuickMenuItem,
  useReorderQuickMenuItems,
  type QuickMenuItem,
} from '@/hooks/useQuickMenu';
import { QuickMenuIconDisplay } from './components/QuickMenuIconDisplay';
import { QuickMenuItemForm } from './components/QuickMenuItemForm';
import { QuickMenuItemPreview } from './components/QuickMenuItemPreview';

function formatSchedule(item: QuickMenuItem): string {
  if (!item.startDate && !item.endDate) return 'Always on';
  const start = item.startDate ? new Date(item.startDate).toLocaleDateString() : '…';
  const end = item.endDate ? new Date(item.endDate).toLocaleDateString() : '…';
  return `${start} – ${end}`;
}

export default function QuickMenuPage() {
  const { data: items, isLoading } = useQuickMenuItems();
  const updateItem = useUpdateQuickMenuItem();
  const deleteItem = useDeleteQuickMenuItem();
  const reorderItems = useReorderQuickMenuItems();

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuickMenuItem | null>(null);
  const [previewItem, setPreviewItem] = useState<QuickMenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuickMenuItem | null>(null);

  const openCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: QuickMenuItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  // Drag-and-drop reorder — mirrors CategoriesTree's DragDropContext usage.
  // Homepage rendering always sorts by displayOrder ASC regardless of how
  // that order was produced, so if a drag is somehow interrupted mid-flight
  // (network error on the reorder call), the stored numeric displayOrder
  // from before the drag stays authoritative — nothing here can leave the
  // homepage in a broken or unordered state.
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !items) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const orders = reordered.map((item, index) => ({ id: item.id, displayOrder: index }));
    reorderItems.mutate(orders);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteItem.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quick Menu</h1>
          <p className="text-muted-foreground">
            Manage the homepage Quick Menu shortcuts shown right under the hero — icon, title, link, and order.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Quick Menu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            {items?.length ?? 0} item{(items?.length ?? 0) === 1 ? '' : 's'} configured — drag the handle to reorder
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !items || items.length === 0 ? (
            <div className="py-12 text-center">
              <LayoutGrid className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No Quick Menu items yet.</h3>
              <p className="mb-4 text-muted-foreground">Add your first shortcut to get started.</p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Quick Menu
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Icon</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="quick-menu-items">
                  {(provided) => (
                    <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                      {items.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={provided.draggableProps.style as any}
                              className={snapshot.isDragging ? 'bg-muted/50' : undefined}
                            >
                              <TableCell {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                              </TableCell>
                              <TableCell>
                                <QuickMenuIconDisplay
                                  iconType={item.iconType}
                                  iconKey={item.iconKey}
                                  iconUrl={item.iconUrl}
                                  size="sm"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{item.title}</div>
                                {item.subtitle && (
                                  <div className="text-sm text-muted-foreground">{item.subtitle}</div>
                                )}
                                {item.badge && (
                                  <Badge variant="outline" className="mt-1 text-[10px]">
                                    {item.badge}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <span className="max-w-[180px] truncate font-mono text-xs">{item.link}</span>
                                  {item.linkType === 'EXTERNAL' && <ExternalLink className="h-3 w-3 shrink-0" />}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={item.isActive}
                                    onCheckedChange={(checked) =>
                                      updateItem.mutate({ id: item.id, data: { isActive: checked } })
                                    }
                                    aria-label="Toggle active"
                                  />
                                  <Badge variant={item.isActive ? 'default' : 'secondary'}>
                                    {item.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{formatSchedule(item)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setPreviewItem(item)} aria-label="Preview">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget(item)}
                                    aria-label="Delete item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              </DragDropContext>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuickMenuItemForm open={formOpen} onOpenChange={setFormOpen} item={editingItem} />
      <QuickMenuItemPreview open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)} item={previewItem} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this Quick Menu item?"
        description={`"${deleteTarget?.title}" will be permanently removed from the homepage. This cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={deleteItem.isPending}
        variant="destructive"
      />
    </div>
  );
}
