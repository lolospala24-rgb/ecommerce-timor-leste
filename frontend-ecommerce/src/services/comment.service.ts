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
        },
      };
    }
  }

  async createComment(videoId: string, content: string): Promise<Comment> {
    // `api` unwraps the response to the JSON body at runtime (see lib/api.ts
    // interceptor), but axios's own types don't know that — hence the cast.
    return api.post<Comment>(`/videos/${videoId}/comments`, { content }) as unknown as Promise<Comment>;
  }

  async likeComment(commentId: string): Promise<{ likes: number; isLiked: boolean }> {
    return api.post<{ likes: number; isLiked: boolean }>(`/comments/${commentId}/like`) as unknown as Promise<{ likes: number; isLiked: boolean }>;
  }

  async unlikeComment(commentId: string): Promise<{ likes: number; isLiked: boolean }> {
    return api.delete<{ likes: number; isLiked: boolean }>(`/comments/${commentId}/like`) as unknown as Promise<{ likes: number; isLiked: boolean }>;
  }

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  }
}

export const commentService = CommentService.getInstance();