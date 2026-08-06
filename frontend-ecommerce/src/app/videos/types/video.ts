export interface Video {
  id: string
  title: string
  description?: string
  url: string
  thumbnail?: string
  duration?: number
  views?: number
  likes?: number
  creatorId: string
  creatorName?: string
  createdAt?: string
  category?: string
  tags?: string[]
}
