'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, LayoutTemplate } from 'lucide-react';
import {
  useHomepageSections,
  useHomepageSection,
  useUpdateHomepageSection,
  useDeleteHomepageSection,
  useReorderHomepageSections,
  type HomepageSectionListItem,
  type HomepageSectionRule,
} from '@/hooks/useHomepageSections';
import { SectionForm } from './components/SectionForm';

const RULE_LABELS: Record<HomepageSectionRule, string> = {
  MANUAL: 'Manual Product Selection',
  NEWEST: 'Automatic · Newest Products',
  POPULAR: 'Automatic · Popularity',
  BEST_SELLING: 'Automatic · Best Selling',
  LOCAL: 'Automatic · Local Category',
  ON_SALE: 'Automatic · On Sale',
  LIMITED_STOCK: 'Automatic · Limited Stock',
  CATEGORY: 'Automatic · Category',
};

export default function HomepageSectionsPage() {
  const { data: sections, isLoading } = useHomepageSections();
  const updateSection = useUpdateHomepageSection();
  const deleteSection = useDeleteHomepageSection();
  const reorderSections = useReorderHomepageSections();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomepageSectionListItem | null>(null);

  const { data: editingSection } = useHomepageSection(editingId);

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (id: number) => {
    setEditingId(id);
    setFormOpen(true);
  };

  const move = (index: number, direction: -1 | 1) => {
    if (!sections) return;
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const a = sections[index];
    const b = sections[target];
    reorderSections.mutate([
      { id: a.id, displayOrder: b.displayOrder },
      { id: b.id, displayOrder: a.displayOrder },
    ]);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteSection.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Homepage Sections</h1>
          <p className="text-muted-foreground">
            Configure which product sections appear on the storefront homepage, in what order, and how each one selects its products.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>
            {sections?.length ?? 0} section{(sections?.length ?? 0) === 1 ? '' : 's'} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !sections || sections.length === 0 ? (
            <div className="py-12 text-center">
              <LayoutTemplate className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No sections yet</h3>
              <p className="text-muted-foreground">Add your first homepage section to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{section.name}</span>
                      <Badge variant={section.isActive ? 'default' : 'secondary'}>
                        {section.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">Position: {index + 1}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {RULE_LABELS[section.rule]} · {section._count.products} product
                      {section.rule === 'MANUAL' ? ' selected' : ' limit ' + section.productLimit}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === 0 || reorderSections.isPending}
                      onClick={() => move(index, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === sections.length - 1 || reorderSections.isPending}
                      onClick={() => move(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={section.isActive}
                      onCheckedChange={(checked) => updateSection.mutate({ id: section.id, data: { isActive: checked } })}
                      aria-label="Toggle active"
                    />
                    <Button variant="outline" size="sm" onClick={() => openEdit(section.id)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(section)}
                      aria-label="Delete section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SectionForm open={formOpen} onOpenChange={setFormOpen} section={editingId ? editingSection : null} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this section?"
        description={`"${deleteTarget?.name}" will be permanently removed from the homepage. This cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={deleteSection.isPending}
        variant="destructive"
      />
    </div>
  );
}
