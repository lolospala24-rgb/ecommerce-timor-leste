// placeholder for src/modules/products/dto/product-response.dto.ts
export class ProductResponseDto {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string;
  descriptionTetum: string | null;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  stock: number;
  sku: string | null;
  barcode: string | null;
  videoUrl: string | null;
  images: string[];
  thumbnail: string | null;
  weight: number | null;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  sellerId: number;
  seller?: {
    id: number;
    storeName: string;
  };
  categoryId: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  
  // Aggregated data
  rating?: number;
  totalReviews?: number;
  ratingDistribution?: Array<{ rating: number; count: number }>;
}