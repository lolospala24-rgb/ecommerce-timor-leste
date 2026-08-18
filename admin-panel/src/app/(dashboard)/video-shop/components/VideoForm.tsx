'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, Film, ImageIcon, X } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useDebounce } from '@/hooks/useDebounce';
import { useCreateVideo, VideoStatus } from '@/hooks/useVideos';

interface VideoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const MAX_VIDEO_SIZE_MB = 100;
const MAX_THUMBNAIL_SIZE_MB = 5;

// Upload-only — editing an existing video's status/visibility/toggles/etc
// happens in VideoDetailPanel (the slide-in panel opened from a table row),
// which already has its own PATCH flow via useUpdateVideo.
export function VideoForm({ onSuccess, onCancel }: VideoFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [status, setStatus] = useState<VideoStatus>('PUBLISHED');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const debouncedSearch = useDebounce(productSearch, 300);
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({ search: debouncedSearch, limit: 20 });
  const products = productsData?.data ?? [];

  const createVideo = useCreateVideo();
  const isSaving = createVideo.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!videoFile) return;

    await createVideo.mutateAsync({
      title,
      description,
      productId,
      status,
      visibility: 'PUBLIC',
      allowComments: true,
      allowLikes: true,
      allowSharing: true,
      allowSave: true,
      enableShopping: true,
      publishedAt: '',
      videoFile,
      thumbnailFile,
    });

    onSuccess();
  };

  const handleVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && !file.type.startsWith('video/')) {
      toast.error('Please select a video file.');
      event.target.value = '';
      return;
    }
    if (file && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`Video must be ${MAX_VIDEO_SIZE_MB}MB or smaller.`);
      event.target.value = '';
      return;
    }
    setVideoFile(file);
  };

  const handleThumbnailFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && !file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      event.target.value = '';
      return;
    }
    if (file && file.size > MAX_THUMBNAIL_SIZE_MB * 1024 * 1024) {
      toast.error(`Thumbnail must be ${MAX_THUMBNAIL_SIZE_MB}MB or smaller.`);
      event.target.value = '';
      return;
    }
    setThumbnailFile(file);
  };

  const videoPreviewUrl = videoFile ? URL.createObjectURL(videoFile) : undefined;
  const thumbnailPreviewUrl = thumbnailFile ? URL.createObjectURL(thumbnailFile) : undefined;

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
          <Label htmlFor="video-file">Video file</Label>
          {videoPreviewUrl ? (
            <div className="relative overflow-hidden rounded-lg border bg-black">
              <video src={videoPreviewUrl} controls className="max-h-48 w-full object-contain" />
              <button
                type="button"
                onClick={() => setVideoFile(null)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-700 hover:bg-white"
                aria-label="Remove selected video"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <Film className="mr-2 h-5 w-5" /> No video selected
            </div>
          )}
          <Input id="video-file" type="file" accept="video/*" onChange={handleVideoFileChange} required />
          <p className="text-xs text-muted-foreground">Max {MAX_VIDEO_SIZE_MB}MB.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnail-file">Thumbnail</Label>
          {thumbnailPreviewUrl ? (
            <div className="relative h-32 w-full overflow-hidden rounded-lg border bg-muted">
              <Image src={thumbnailPreviewUrl} alt="Thumbnail preview" fill className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => setThumbnailFile(null)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-700 hover:bg-white"
                aria-label="Remove selected thumbnail"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <ImageIcon className="mr-2 h-5 w-5" /> No thumbnail selected
            </div>
          )}
          <Input id="thumbnail-file" type="file" accept="image/*" onChange={handleThumbnailFileChange} />
          <p className="text-xs text-muted-foreground">Max {MAX_THUMBNAIL_SIZE_MB}MB.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Initial status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as VideoStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLISHED">Publish immediately</SelectItem>
            <SelectItem value="PENDING">Save as pending (review later)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Scheduling and the rest of the publishing options are available after upload, from the video&apos;s detail panel.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          Upload video
        </Button>
      </div>
    </form>
  );
}
