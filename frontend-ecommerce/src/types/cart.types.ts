export interface CartItem {
  id?: number;
  productId: number;
  variantId?: number | null;
  variantSku?: string | null;
  variantAttributes?: Record<string, string> | null;
  variantThumbnail?: string | null;
  name: string;
  nameTetum?: string | null;
  slug: string;
  price: number;
  comparePrice?: number | null;
  thumbnail: string | null;
  quantity: number;
  stock: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  shipping: number;
  total: number;
}