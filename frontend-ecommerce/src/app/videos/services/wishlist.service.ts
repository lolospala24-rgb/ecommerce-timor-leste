const BASE = '/api'

export async function addToWishlist(payload: { productId: string }) {
  const res = await fetch(`${BASE}/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to add to wishlist')
  return res.json()
}
