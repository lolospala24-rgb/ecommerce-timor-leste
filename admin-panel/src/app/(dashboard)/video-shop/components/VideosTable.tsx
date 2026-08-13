'use client';

import Image from 'next/image';
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
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2, Image as ImageIcon, MessageCircle, Heart } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AdminVideo, useDeleteVideo, useToggleVideoStatus } from '@/hooks/useVideos';

interface VideosTableProps {
  videos: AdminVideo[];
  onEdit: (video: AdminVideo) => void;
  onPreview: (video: AdminVideo) => void;
}

export function VideosTable({ videos, onEdit, onPreview }: VideosTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdminVideo | null>(null);
  const deleteVideo = useDeleteVideo();
  const toggleStatus = useToggleVideoStatus();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteVideo.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Video</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No videos found
              </TableCell>
            </TableRow>
          ) : (
            videos.map((video) => (
              <TableRow key={video.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onPreview(video)}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {video.thumbnailUrl ? (
                        <Image src={video.thumbnailUrl} alt={video.title} fill sizes="80px" className="object-cover" unoptimized />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="max-w-[220px]">
                      <p className="truncate font-medium">{video.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{video.description || 'No description'}</p>
                    </div>
                  </button>
                </TableCell>
                <TableCell>
                  {video.product ? (
                    <div>
                      <p className="text-sm font-medium">{video.product.name}</p>
                      <p className="text-xs text-muted-foreground">{video.product.seller?.storeName ?? 'Unknown seller'}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No product linked</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {video.views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {video.likes.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" /> {video._count?.comments ?? 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={video.isActive}
                      disabled={toggleStatus.isPending}
                      onCheckedChange={(checked) => toggleStatus.mutate({ id: video.id, isActive: checked })}
                      aria-label={video.isActive ? 'Unpublish video' : 'Publish video'}
                    />
                    <Badge variant={video.isActive ? 'default' : 'secondary'}>
                      {video.isActive ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(video.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onPreview(video)}>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(video)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteTarget(video)} className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
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
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Video"
        description={`Are you sure you want to delete "${deleteTarget?.title ?? 'this video'}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleteVideo.isPending}
      />
    </>
  );
}
