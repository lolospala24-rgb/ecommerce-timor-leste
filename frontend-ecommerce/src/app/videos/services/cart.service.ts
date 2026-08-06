const BASE = '/api'

export async function addToCart(payload: { productId: string; quantity?: number }) {
  const res = await fetch(`${BASE}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to add to cart')
  return res.json()
}
