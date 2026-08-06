export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  likes: number;
  isLiked: boolean;
  isPinned?: boolean;
  isVerifiedBuyer?: boolean;
  createdAt: string;
  replies?: Comment[];
}

export interface CommentResponse {
  data: Comment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}