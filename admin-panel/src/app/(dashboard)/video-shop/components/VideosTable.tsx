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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2, Image as ImageIcon, MessageCircle, Heart, BadgeCheck } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AdminVideo, useDeleteVideo } from '@/hooks/useVideos';
import { VideoStatusBadge } from './VideoStatusBadge';

interface VideosTableProps {
  videos: AdminVideo[];
  onOpen: (video: AdminVideo) => void;
  onEdit: (video: AdminVideo) => void;
  onPreview: (video: AdminVideo) => void;
}

export function VideosTable({ videos, onOpen, onEdit, onPreview }: VideosTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdminVideo | null>(null);
  const deleteVideo = useDeleteVideo();

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
            <TableHead>Seller</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Stats</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No videos found
              </TableCell>
            </TableRow>
          ) : (
            videos.map((video) => {
              const seller = video.product?.seller;
              const category = video.product?.category;

              return (
                <TableRow
                  key={video.id}
                  className="cursor-pointer"
                  onClick={() => onOpen(video)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3 text-left">
                      <div className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {video.thumbnailUrl ? (
                          <Image src={video.thumbnailUrl} alt={video.title} fill sizes="80px" className="object-cover" unoptimized />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="max-w-[220px]">
                        <p className="truncate font-medium">{video.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {seller ? (
                      <div className="flex items-center gap-2">
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                          {seller.storeLogo ? (
                            <Image src={seller.storeLogo} alt={seller.storeName} fill sizes="28px" className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
                              {seller.storeName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium">{seller.storeName}</p>
                            {seller.isVerified && <BadgeCheck className="h-3 w-3 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(seller._count?.followers ?? 0).toLocaleString()} Followers
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No seller</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {category ? (
                      <Badge variant="secondary" className="font-normal">
                        {category.name}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{video.product ? '1 Product' : 'No product'}</span>
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
                    <VideoStatusBadge status={video.status} />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                          <Edit className="mr-2 h-4 w-4" /> Edit details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteTarget(video)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
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
