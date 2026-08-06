import { Product } from '../types/product'

const BASE = '/api'

export async function fetchProductsForVideo(videoId: string): Promise<Product[]> {
  const res = await fetch(`${BASE}/videos/${videoId}/products`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`${BASE}/products/${id}`)
  if (!res.ok) throw new Error('Failed to fetch product')
  return res.json()
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${BASE}/products`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}
