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
  brand?: string | null;
  specifications?: Record<string, unknown> | null;
  hasVariants?: boolean;
  // Wholesale/packaging — informational reference pricing only, not
  // purchasable through cart/checkout at these rates. See backend
  // schema.prisma's Product model comment for the full rationale.
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  packagingName?: string | null;
  packagingUnitCount?: number | null;
  packagingPrice?: number | null;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
  isLocallyMade?: boolean;
  producerName?: string | null;
  producerOrganization?: string | null;
  producerPhone?: string | null;
  // Server-resolved by resolveProductOrigin (SELLER_ORIGIN falls back to the
  // seller's declared origin; CUSTOM_ORIGIN uses the product's own origin*
  // fields) — never re-derive this client-side from raw origin* fields.
  resolvedOrigin?: {
    municipality: string;
    postoAdmin: string | null;
    suco: string | null;
    aldeia: string | null;
  } | null;
  seller?: {
    id: number;
    storeName: string;
    storeLogo?: string | null;
    storeAddress?: string | null;
    storePhone?: string | null;
    isVerified?: boolean;
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
  ratingDistribution?: { rating: number; count: number }[];
  // Units sold across DELIVERED orders only — see products.service.ts#findBySlug.
  salesCount?: number;
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