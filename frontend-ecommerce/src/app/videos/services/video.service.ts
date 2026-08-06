import { Video } from '../types/video'

const BASE = '/api'

export async function fetchVideos(page = 1, pageSize = 12): Promise<Video[]> {
  const res = await fetch(`${BASE}/videos?page=${page}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('Failed to fetch videos')
  return res.json()
}

export async function fetchVideoById(id: string): Promise<Video> {
  const res = await fetch(`${BASE}/videos/${id}`)
  if (!res.ok) throw new Error('Failed to fetch video')
  return res.json()
}

export async function likeVideo(id: string) {
  const res = await fetch(`${BASE}/videos/${id}/like`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to like')
  return res.json()
}
