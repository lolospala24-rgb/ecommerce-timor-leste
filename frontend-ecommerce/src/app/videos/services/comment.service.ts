import { Comment } from '../types/comment'

const BASE = '/api'

export async function fetchComments(videoId: string): Promise<Comment[]> {
  const res = await fetch(`${BASE}/videos/${videoId}/comments`)
  if (!res.ok) throw new Error('Failed to fetch comments')
  return res.json()
}

export async function postComment(videoId: string, body: { content: string }) {
  const res = await fetch(`${BASE}/videos/${videoId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to post comment')
  return res.json()
}
