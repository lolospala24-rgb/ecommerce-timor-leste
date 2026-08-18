'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export type VideoStatus = 'PENDING' | 'PUBLISHED' | 'SCHEDULED' | 'REJECTED';
export type VideoVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

export interface AdminVideoSeller {
  id: number;
  storeName: string;
  storeLogo?: string | null;
  isVerified?: boolean;
  _count?: { followers: number };
}

export interface AdminVideoCategory {
  id: number;
  name: string;
}

export interface AdminVideoProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  thumbnail: string | null;
  stock?: number;
  seller?: AdminVideoSeller | null;
  category?: AdminVideoCategory | null;
}

export interface AdminVideo {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  status: VideoStatus;
  visibility: VideoVisibility;
  allowComments: boolean;
  allowLikes: boolean;
  allowSharing: boolean;
  allowSave: boolean;
  enableShopping: boolean;
  publishedAt: string | null;
  views: number;
  likes: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
  product: AdminVideoProduct | null;
  _count?: { comments: number; savedBy: number };
}

export interface AdminVideoFilters {
  search?: string;
  status?: VideoStatus | 'all';
  sellerId?: number;
  categoryId?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'views' | 'likes' | 'comments';
  sortOrder?: 'asc' | 'desc';
}

export interface VideoStatusCounts {
  all: number;
  PENDING: number;
  PUBLISHED: number;
  SCHEDULED: number;
  REJECTED: number;
}

export interface VideoComment {
  id: number;
  content: string;
  likes: number;
  createdAt: string;
  user: { id: number; name: string; email: string };
  video: { id: number; title: string; thumbnailUrl: string | null };
}

export interface VideoFormValues {
  title: string;
  description: string;
  productId: string;
  status: VideoStatus;
  visibility: VideoVisibility;
  allowComments: boolean;
  allowLikes: boolean;
  allowSharing: boolean;
  allowSave: boolean;
  enableShopping: boolean;
  // Datetime-local input string (e.g. "2026-08-20T14:30") — converted to
  // an ISO string in buildVideoFormData, required only when status is
  // SCHEDULED (see VideosService.resolvePublishedAt on the backend).
  publishedAt: string;
  videoFile: File | null;
  thumbnailFile: File | null;
}

// The backend's global TransformInterceptor wraps every controller return
// value as `{ status: 'success', data: <returned value> }`. The videos/
// sellers controllers *also* return their own `{ success, data, total? }`
// envelope (this module's established style — see reviews/sellers
// controllers), so after axios's interceptor already strips the HTTP
// envelope, what's left is still one level deeper than it looks:
// `response.data` is the controller's own `{ success, data, total }`
// object, not the payload itself — the real payload is `response.data.data`
// (and `response.data.total` for paginated lists).
interface ControllerEnvelope<T> {
  data?: T;
  total?: number;
}

function unwrapList<T>(response: unknown): { items: T[]; total: number } {
  const inner = (response as { data?: ControllerEnvelope<T[]> })?.data;
  return { items: inner?.data ?? [], total: Number(inner?.total ?? 0) };
}

function unwrapItem<T>(response: unknown): T {
  const inner = (response as { data?: ControllerEnvelope<T> })?.data;
  return inner?.data as T;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message || fallback;
  }
  return fallback;
}

function buildVideoFormData(values: Partial<VideoFormValues>): FormData {
  const formData = new FormData();
  if (values.title !== undefined) formData.append('title', values.title);
  if (values.description !== undefined) formData.append('description', values.description);
  if (values.productId) formData.append('productId', values.productId);
  if (values.status !== undefined) formData.append('status', values.status);
  if (values.visibility !== undefined) formData.append('visibility', values.visibility);
  if (values.allowComments !== undefined) formData.append('allowComments', String(values.allowComments));
  if (values.allowLikes !== undefined) formData.append('allowLikes', String(values.allowLikes));
  if (values.allowSharing !== undefined) formData.append('allowSharing', String(values.allowSharing));
  if (values.allowSave !== undefined) formData.append('allowSave', String(values.allowSave));
  if (values.enableShopping !== undefined) formData.append('enableShopping', String(values.enableShopping));
  if (values.publishedAt) {
    // datetime-local has no timezone — new Date() interprets it in the
    // browser's local zone, which is what the admin actually picked.
    formData.append('publishedAt', new Date(values.publishedAt).toISOString());
  }
  if (values.videoFile) formData.append('video', values.videoFile);
  if (values.thumbnailFile) formData.append('thumbnail', values.thumbnailFile);
  return formData;
}

export function useAdminVideos(filters: AdminVideoFilters = {}) {
  return useQuery({
    queryKey: ['admin-videos', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.sellerId) params.set('sellerId', String(filters.sellerId));
      if (filters.categoryId) params.set('categoryId', String(filters.categoryId));
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const response = await api.get(`/videos?${params.toString()}`);
      return unwrapList<AdminVideo>(response);
    },
    staleTime: 30_000,
  });
}

export function useVideoStatusCounts() {
  return useQuery({
    queryKey: ['admin-videos', 'status-counts'],
    queryFn: async () => {
      const response = await api.get('/videos/status-counts');
      return unwrapItem<VideoStatusCounts>(response);
    },
    staleTime: 30_000,
  });
}

export function useVideo(id: number | null) {
  return useQuery({
    queryKey: ['admin-video', id],
    queryFn: async () => {
      const response = await api.get(`/videos/${id}`);
      return unwrapItem<AdminVideo>(response);
    },
    enabled: id != null,
  });
}

function invalidateVideoLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
}

export function useCreateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: VideoFormValues) => {
      const response = await api.post('/videos', buildVideoFormData(values), {
        headers: { 'Content-Type': 'multipart/form-data' },
        // The shared client's 30s default is fine for JSON requests but too
        // short once a video file is in the body — a few minutes' upload on
        // a modest connection would otherwise be aborted client-side well
        // before the server (or Cloudinary) has a chance to finish.
        timeout: 120000,
      });
      return unwrapItem<AdminVideo>(response);
    },
    onSuccess: () => {
      invalidateVideoLists(queryClient);
      toast.success('Video created successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to create video'));
    },
  });
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: Partial<VideoFormValues> }) => {
      const response = await api.patch(`/videos/${id}`, buildVideoFormData(values), {
        headers: { 'Content-Type': 'multipart/form-data' },
        // See useCreateVideo — a video file in the body needs more than the
        // shared client's 30s JSON-request default.
        timeout: 120000,
      });
      return unwrapItem<AdminVideo>(response);
    },
    onSuccess: (_data, variables) => {
      invalidateVideoLists(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin-video', variables.id] });
      toast.success('Video updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to update video'));
    },
  });
}

// Quick status transition (Publish/Reject/etc from the table row menu) —
// same PATCH endpoint as useUpdateVideo, just a narrower one-field payload.
export function useUpdateVideoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, publishedAt }: { id: number; status: VideoStatus; publishedAt?: string }) => {
      const response = await api.patch(`/videos/${id}`, buildVideoFormData({ status, publishedAt }), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapItem<AdminVideo>(response);
    },
    onSuccess: (_data, variables) => {
      invalidateVideoLists(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin-video', variables.id] });
      toast.success(`Video marked ${variables.status.toLowerCase()}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to update video status'));
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/videos/${id}`);
    },
    onSuccess: () => {
      invalidateVideoLists(queryClient);
      toast.success('Video deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to delete video'));
    },
  });
}

export function useVideoComments(filters: { search?: string; videoId?: number; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['admin-video-comments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.videoId) params.set('videoId', String(filters.videoId));
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));

      const response = await api.get(`/videos/comments?${params.toString()}`);
      return unwrapList<VideoComment>(response);
    },
    staleTime: 30_000,
  });
}

export function useDeleteVideoComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: number) => {
      await api.delete(`/videos/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-video-comments'] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to delete comment'));
    },
  });
}
