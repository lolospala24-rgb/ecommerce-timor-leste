'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, UploadCloud, Film, ImageIcon, X } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useDebounce } from '@/hooks/useDebounce';
import { useCreateVideo, useUpdateVideo, AdminVideo } from '@/hooks/useVideos';

interface VideoFormProps {
  video: AdminVideo | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Remounted by `key={video?.id ?? 'new'}` in the parent whenever the
// target video changes, so initial state below only ever needs to run
// once per target — no effect+setState prefill needed (see
// https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes).
export function VideoForm({ video, onSuccess, onCancel }: VideoFormProps) {
  const isEditing = !!video;
  const [title, setTitle] = useState(video?.title ?? '');
  const [description, setDescription] = useState(video?.description ?? '');
  const [productId, setProductId] = useState(video?.product ? String(video.product.id) : '');
  const [productSearch, setProductSearch] = useState('');
  const [isActive, setIsActive] = useState(video?.isActive ?? true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const debouncedSearch = useDebounce(productSearch, 300);
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({ search: debouncedSearch, limit: 20 });
  const products = productsData?.data ?? [];

  const createVideo = useCreateVideo();
  const updateVideo = useUpdateVideo();
  const isSaving = createVideo.isPending || updateVideo.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEditing && !videoFile) {
      return;
    }

    const values = {
      title,
      description,
      productId,
      isActive,
      videoFile,
      thumbnailFile,
    };

    if (isEditing && video) {
      await updateVideo.mutateAsync({ id: video.id, values });
    } else {
      await createVideo.mutateAsync(values);
    }

    onSuccess();
  };

  const videoPreviewUrl = videoFile ? URL.createObjectURL(videoFile) : video?.videoUrl;
  const thumbnailPreviewUrl = thumbnailFile ? URL.createObjectURL(thumbnailFile) : video?.thumbnailUrl;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Video title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Smartphone XYZ Pro Demo"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product">Linked product</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger id="product">
              <SelectValue placeholder="No product linked" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <Input
                  placeholder="Search product..."
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </div>
              {isLoadingProducts ? (
                <div className="flex items-center justify-center p-3 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : products.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No products found</p>
              ) : (
                products.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the video content and product benefits."
          rows={3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="video-file">Video file {isEditing && '(leave empty to keep current)'}</Label>
          {videoPreviewUrl ? (
            <div className="relative overflow-hidden rounded-lg border bg-black">
              <video src={videoPreviewUrl} controls className="max-h-48 w-full object-contain" />
              {videoFile && (
                <button
                  type="button"
                  onClick={() => setVideoFile(null)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-700 hover:bg-white"
                  aria-label="Remove selected video"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <Film className="mr-2 h-5 w-5" /> No video selected
            </div>
          )}
          <Input
            id="video-file"
            type="file"
            accept="video/*"
            onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
            required={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnail-file">Thumbnail {isEditing && '(leave empty to keep current)'}</Label>
          {thumbnailPreviewUrl ? (
            <div className="relative h-32 w-full overflow-hidden rounded-lg border bg-muted">
              <Image src={thumbnailPreviewUrl} alt="Thumbnail preview" fill className="object-cover" unoptimized />
              {thumbnailFile && (
                <button
                  type="button"
                  onClick={() => setThumbnailFile(null)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-700 hover:bg-white"
                  aria-label="Remove selected thumbnail"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <ImageIcon className="mr-2 h-5 w-5" /> No thumbnail selected
            </div>
          )}
          <Input
            id="thumbnail-file"
            type="file"
            accept="image/*"
            onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="font-medium">Publish</p>
          <p className="text-sm text-muted-foreground">Whether this video is visible on the customer video feed.</p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          {isEditing ? 'Save changes' : 'Upload video'}
        </Button>
      </div>
    </form>
  );
}
