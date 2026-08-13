'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/shared/Pagination';
import { MessageSquareText, Search, Trash2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useVideoComments, useDeleteVideoComment, VideoComment } from '@/hooks/useVideos';

export function VideoCommentsModeration() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<VideoComment | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isFetching } = useVideoComments({ search: debouncedSearch, page, limit: 20 });
  const deleteComment = useDeleteVideoComment();

  const comments = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteComment.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Comment Moderation
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{total} comment{total === 1 ? '' : 's'} across all videos</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search comment content..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {search ? `No comments match "${search}".` : 'No comments have been posted yet.'}
          </div>
        ) : (
          <div className={`space-y-3 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{comment.user.name}</span>
                    <span>{comment.user.email}</span>
                    <span>·</span>
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                  <p className="text-xs text-muted-foreground">
                    On video: <span className="font-medium">{comment.video.title}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(comment)}
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={20}
            onPageChange={setPage}
            showTotal={false}
          />
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleteComment.isPending}
      />
    </Card>
  );
}
