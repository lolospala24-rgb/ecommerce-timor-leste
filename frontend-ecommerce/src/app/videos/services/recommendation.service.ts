import { Video } from '../types/video'
const BASE = '/api'

export async function fetchVideoRecommendations(videoId?: string): Promise<Video[]> {
  const url = videoId ? `${BASE}/recommendations/videos?for=${videoId}` : `${BASE}/recommendations/videos`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch recommendations')
  return res.json() as Promise<Video[]>
}

export async function fetchProductRecommendations() {
  const res = await fetch(`${BASE}/recommendations/products`)
  if (!res.ok) throw new Error('Failed to fetch product recommendations')
  return res.json()
}
