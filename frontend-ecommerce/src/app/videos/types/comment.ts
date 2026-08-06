export interface Comment {
  id: string
  videoId: string
  authorId: string
  authorName: string
  authorAvatar?: string
  content: string
  createdAt: string
  likes?: number
  replies?: Comment[]
}
