'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Loader2, Film, ImageIcon, X, Upload } from 'lucide-react';

const MAX_VIDEO_SIZE_MB = 100;
const MAX_THUMBNAIL_SIZE_MB = 5;

const VIDEO_ACCEPT = { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'video/quicktime': ['.mov'] };
const THUMBNAIL_ACCEPT = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/gif': ['.gif'], 'image/webp': ['.webp'] };

interface VideoFileDropzoneProps {
  kind: 'video' | 'thumbnail';
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Currently-saved asset URL, shown when there's no newly-picked file yet
   *  (edit mode) — lets an admin see what's live before deciding to replace it. */
  existingUrl?: string | null;
  uploadProgress?: number;
  isUploading?: boolean;
  required?: boolean;
}

// Shared by VideoForm (create) and VideoDetailPanel (replace on an existing
// video) — same drag-drop + preview + progress-bar treatment either way, so
// picking a file feels identical whether it's the first upload or a
// replacement.
export function VideoFileDropzone({
  kind,
  file,
  onFileChange,
  existingUrl,
  uploadProgress,
  isUploading,
  required,
}: VideoFileDropzoneProps) {
  const isVideo = kind === 'video';
  const maxSizeMb = isVideo ? MAX_VIDEO_SIZE_MB : MAX_THUMBNAIL_SIZE_MB;

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const tooLarge = fileRejections[0].errors.some((e) => e.code === 'file-too-large');
        toast.error(
          tooLarge
            ? `${isVideo ? 'Video' : 'Thumbnail'} must be ${maxSizeMb}MB or smaller.`
            : `Please select a valid ${isVideo ? 'video' : 'image'} file.`,
        );
        return;
      }
      onFileChange(acceptedFiles[0] ?? null);
    },
    [isVideo, maxSizeMb, onFileChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: isVideo ? VIDEO_ACCEPT : THUMBNAIL_ACCEPT,
    maxFiles: 1,
    maxSize: maxSizeMb * 1024 * 1024,
    disabled: isUploading,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URLs live until explicitly revoked — without this, every
  // replace/remove cycle in one editing session leaks the previous blob.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displayUrl = previewUrl ?? existingUrl ?? null;

  if (isUploading) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Uploading... {uploadProgress ?? 0}%</p>
        <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${uploadProgress ?? 0}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative overflow-hidden rounded-lg border bg-black">
          {isVideo ? (
            <video src={displayUrl} controls className="max-h-48 w-full object-contain" />
          ) : (
            <div className="relative h-32 w-full">
              <Image src={displayUrl} alt="Thumbnail preview" fill className="object-cover" unoptimized />
            </div>
          )}
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-700 hover:bg-white"
            aria-label={`Remove ${kind}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        {displayUrl ? (
          <span className="flex items-center justify-center gap-1.5 font-medium text-primary">
            <Upload className="h-3.5 w-3.5" />
            {previewUrl ? `Replace ${kind}` : `Upload new ${kind}`}
          </span>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            {isVideo ? <Film className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
            <span>
              {isDragActive
                ? `Drop the ${kind} here...`
                : `Drag & drop, or click to select${required ? ' (required)' : ''}`}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Max {maxSizeMb}MB.</p>
    </div>
  );
}
