'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { X, Upload, Loader2, Video as VideoIcon } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

interface VideoUploadProps {
  videoUrl: string;
  onChange: (url: string) => void;
}

export function VideoUpload({ videoUrl, onChange }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      toast.error('No file selected');
      return;
    }

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Only MP4, WebM, or MOV video files are allowed');
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Video is ${(file.size / 1024 / 1024).toFixed(1)}MB — max 100MB`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await api.post('/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 5 * 60 * 1000, // videos take longer than image uploads
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      const url = response.data?.data?.url;
      if (url) {
        onChange(url);
        toast.success('Video uploaded successfully');
      } else {
        toast.error('Upload succeeded but no video URL was returned');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to upload video';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try again with a smaller file.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  if (videoUrl && !uploading) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-lg border bg-black">
          <video src={videoUrl} controls className="aspect-video w-full" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 rounded-full"
            onClick={() => onChange('')}
            aria-label="Remove video"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <Button type="button" variant="outline" size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Replace video
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
        ${uploading ? 'cursor-not-allowed opacity-50' : ''}
      `}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      ) : (
        <>
          <VideoIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          {isDragActive ? (
            <p>Drop the video here...</p>
          ) : (
            <div>
              <p className="font-medium">Drag &amp; drop a video here, or click to select</p>
              <p className="mt-1 text-sm text-muted-foreground">Supports: MP4, WebM, MOV (Max 100MB)</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
