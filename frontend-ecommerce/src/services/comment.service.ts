import api from '@/lib/api';
import { Comment, CommentResponse } from '@/types/comment';

class CommentService {
  private static instance: CommentService;

  static getInstance(): CommentService {
    if (!CommentService.instance) {
      CommentService.instance = new CommentService();
    }
    return CommentService.instance;
  }

  async getComments(videoId: string, page: number = 1, limit: number = 10): Promise<CommentResponse> {
    try {
      const response = await api.get<any>(`/videos/${videoId}/comments?page=${page}&limit=${limit}`);
      const payload = response?.data ?? response;
      const data = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? [];
      const total = Number(payload?.total ?? payload?.meta?.total ?? data.length ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch {
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  async createComment(videoId: string, content: string): Promise<Comment> {
    const response = await api.post<Comment>(`/videos/${videoId}/comments`, { content });
    return response;
  }

  async likeComment(commentId: string): Promise<{ likes: number; isLiked: boolean }> {
    const response = await api.post<{ likes: number; isLiked: boolean }>(`/comments/${commentId}/like`);
    return response;
  }

  async unlikeComment(commentId: string): Promise<{ likes: number; isLiked: boolean }> {
    const response = await api.delete<{ likes: number; isLiked: boolean }>(`/comments/${commentId}/like`);
    return response;
  }

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  }
}

export const commentService = CommentService.getInstance();