export interface CommentAuthor {
  id: number;
  name: string;
}

export interface Comment {
  id: number;
  videoId: number;
  userId: number;
  parentId: number | null;
  content: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
  user: CommentAuthor;
  replies: Comment[];
}

export interface CommentListResult {
  items: Comment[];
  total: number;
}
