import { Creator } from '../types/creator'

const BASE = '/api'

export async function fetchCreatorById(id: string): Promise<Creator> {
  const res = await fetch(`${BASE}/creators/${id}`)
  if (!res.ok) throw new Error('Failed to fetch creator')
  return res.json()
}

export async function fetchCreatorVideos(id: string) {
  const res = await fetch(`${BASE}/creators/${id}/videos`)
  if (!res.ok) throw new Error('Failed to fetch creator videos')
  return res.json()
}
