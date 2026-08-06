export interface ProductVariant {
  id: number;
  sku: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  images: string[];
  attributes: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string;
  descriptionTetum: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  sku: string | null;
  barcode: string | null;
  videoUrl?: string | null;
  images: string[];
  thumbnail: string | null;
  weight: number | null;
  slug: string;
  sellerId: number;
  categoryId: number;
  isActive: boolean;
  isFeatured: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
  seller?: {
    id: number;
    storeName: string;
  };
  type?: {
    id: number;
    name: string;
    description?: string | null;
    slug?: string;
    fields?: Record<string, string>;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  rating?: number;
  totalReviews?: number;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  sellerId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  inStock?: boolean;
  minRating?: number;
}