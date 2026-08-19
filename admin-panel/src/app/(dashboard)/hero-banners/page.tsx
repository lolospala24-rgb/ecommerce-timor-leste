'use client';

import { useState } from 'react';
import Image from 'next/image';
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
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Eye, ImageIcon } from 'lucide-react';
import {
  useHeroBanners,
  useUpdateHeroBanner,
  useDeleteHeroBanner,
  useReorderHeroBanners,
  type HeroBanner,
} from '@/hooks/useHeroBanners';
import { HeroBannerForm } from './components/HeroBannerForm';
import { HeroBannerPreview } from './components/HeroBannerPreview';

function formatSchedule(banner: HeroBanner): string {
  if (!banner.startDate && !banner.endDate) return 'Always on';
  const start = banner.startDate ? new Date(banner.startDate).toLocaleDateString() : '…';
  const end = banner.endDate ? new Date(banner.endDate).toLocaleDateString() : '…';
  return `${start} – ${end}`;
}

export default function HeroBannersPage() {
  const { data: banners, isLoading } = useHeroBanners();
  const updateBanner = useUpdateHeroBanner();
  const deleteBanner = useDeleteHeroBanner();
  const reorderBanners = useReorderHeroBanners();

  const [formOpen, setFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [previewBanner, setPreviewBanner] = useState<HeroBanner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroBanner | null>(null);

  const openCreate = () => {
    setEditingBanner(null);
    setFormOpen(true);
  };

  const openEdit = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setFormOpen(true);
  };

  const move = (index: number, direction: -1 | 1) => {
    if (!banners) return;
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    const a = banners[index];
    const b = banners[target];
    reorderBanners.mutate([
      { id: a.id, position: b.position },
      { id: b.id, position: a.position },
    ]);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteBanner.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hero Banners</h1>
          <p className="text-muted-foreground">
            Manage the homepage hero/banner slides shown on the storefront — image, content, schedule, and order.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Banner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Banners</CardTitle>
          <CardDescription>
            {banners?.length ?? 0} banner{(banners?.length ?? 0) === 1 ? '' : 's'} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !banners || banners.length === 0 ? (
            <div className="py-12 text-center">
              <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No hero banners yet</h3>
              <p className="text-muted-foreground">Add your first banner to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner, index) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-muted">
                        <Image src={banner.desktopImage} alt={banner.title} fill className="object-cover" unoptimized />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{banner.title}</div>
                      {banner.subtitle && <div className="text-xs text-muted-foreground">{banner.subtitle}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0 || reorderBanners.isPending}
                          onClick={() => move(index, -1)}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === banners.length - 1 || reorderBanners.isPending}
                          onClick={() => move(index, 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-sm text-muted-foreground">{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={banner.isActive}
                          onCheckedChange={(checked) => updateBanner.mutate({ id: banner.id, data: { isActive: checked } })}
                          aria-label="Toggle active"
                        />
                        <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                          {banner.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatSchedule(banner)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewBanner(banner)} aria-label="Preview">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(banner)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(banner)}
                          aria-label="Delete banner"
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
      </Card>

      <HeroBannerForm open={formOpen} onOpenChange={setFormOpen} banner={editingBanner} />
      <HeroBannerPreview open={!!previewBanner} onOpenChange={(open) => !open && setPreviewBanner(null)} banner={previewBanner} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this hero banner?"
        description={`"${deleteTarget?.title}" will be permanently removed from the homepage. This cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={deleteBanner.isPending}
        variant="destructive"
      />
    </div>
  );
}
