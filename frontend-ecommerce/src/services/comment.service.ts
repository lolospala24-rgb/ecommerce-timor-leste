import api from '@/lib/api';
import { Comment, CommentListResult } from '@/types/comment';

// See the matching comment in video.service.ts — the backend double-wraps
// every response (global interceptor + this module's own `{success,data}`
// envelope), so the real payload is `response.data.data`, not `response.data`.
function unwrapList(response: any): { items: any[]; total: number } {
  const inner = response?.data;
  const items = Array.isArray(inner?.data) ? inner.data : [];
  return { items, total: Number(inner?.total ?? items.length) };
}

function unwrapItem(response: any): any {
  return response?.data?.data;
}

function normalizeComment(raw: any): Comment {
  return {
    id: Number(raw.id),
    videoId: Number(raw.videoId),
    userId: Number(raw.userId),
    parentId: raw.parentId != null ? Number(raw.parentId) : null,
    content: raw.content,
    likes: Number(raw.likes ?? 0),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    user: { id: Number(raw.user?.id ?? 0), name: raw.user?.name ?? 'User' },
    replies: Array.isArray(raw.replies) ? raw.replies.map(normalizeComment) : [],
  };
}

class CommentService {
  private static instance: CommentService;

  static getInstance(): CommentService {
    if (!CommentService.instance) {
      CommentService.instance = new CommentService();
    }
    return CommentService.instance;
  }

  async getComments(videoId: number, page = 1, limit = 20): Promise<CommentListResult> {
    const response = await api.get(`/videos/${videoId}/comments?page=${page}&limit=${limit}`);
    const { items, total } = unwrapList(response);
    return { items: items.map(normalizeComment), total };
  }

  async createComment(videoId: number, content: string, parentId?: number): Promise<Comment> {
    const response = await api.post(`/videos/${videoId}/comments`, { content, parentId });
    return normalizeComment(unwrapItem(response));
  }

  async deleteComment(commentId: number): Promise<void> {
    await api.delete(`/videos/comments/${commentId}`);
  }

  async likeComment(commentId: number): Promise<{ likes: number }> {
    const response = await api.post(`/videos/comments/${commentId}/like`);
    return unwrapItem(response) ?? { likes: 0 };
  }
}

export const commentService = CommentService.getInstance();
