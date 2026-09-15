'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  images: string[];
  setImages: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, setImages, maxImages = 10 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      if (images.length + acceptedFiles.length > maxImages) {
        toast.error(`You can only upload up to ${maxImages} images`);
        return;
      }

      const valid: File[] = [];
      for (const file of acceptedFiles) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is over 5MB`);
          continue;
        }
        valid.push(file);
      }
      if (valid.length === 0) return;

      setUploading(true);
      setProgress(0);
      const formData = new FormData();
      valid.forEach((file) => formData.append('images', file));

      try {
        const res: any = await api.post('/upload/images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
          onUploadProgress: (e: any) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
        });
        const urls: string[] = res?.data?.urls || res?.urls || [];
        if (urls.length > 0) {
          setImages([...images, ...urls]);
          toast.success(`${urls.length} image(s) uploaded`);
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to upload images');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [images, maxImages, setImages],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
    disabled: uploading || images.length >= maxImages,
  });

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
        } ${uploading || images.length >= maxImages ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading… {progress}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <p className="text-sm">
              <span className="font-medium text-foreground">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs">JPG, PNG, WEBP, GIF — up to {maxImages} images, 5MB each</p>
          </div>
        )}
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {images.map((image, index) => (
            <div key={image + index} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
              <Image src={image} alt={`Image ${index + 1}`} fill unoptimized className="object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          No images yet
        </div>
      )}
    </div>
  );
}
