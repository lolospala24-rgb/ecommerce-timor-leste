'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export interface AdminVideoSeller {
  id: number;
  storeName: string;
  storeLogo?: string | null;
  isVerified?: boolean;
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
}

export interface AdminVideo {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  isActive: boolean;
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
  status?: 'active' | 'draft' | 'all';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'views' | 'likes' | 'comments';
  sortOrder?: 'asc' | 'desc';
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
  isActive: boolean;
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
  if (values.isActive !== undefined) formData.append('isActive', String(values.isActive));
  if (values.productId) formData.append('productId', values.productId);
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

export function useCreateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: VideoFormValues) => {
      const response = await api.post('/videos', buildVideoFormData(values), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapItem<AdminVideo>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
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
      });
      return unwrapItem<AdminVideo>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      toast.success('Video updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to update video'));
    },
  });
}

export function useToggleVideoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await api.patch(`/videos/${id}`, buildVideoFormData({ isActive }), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapItem<AdminVideo>(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      toast.success(variables.isActive ? 'Video published' : 'Video unpublished');
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
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
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
