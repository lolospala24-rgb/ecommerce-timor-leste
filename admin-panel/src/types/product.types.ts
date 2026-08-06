import { SellerSummary } from './seller.types';
import { CategorySummary } from './category.types';

// Product interface
export interface Product {
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
  images: string[];
  thumbnail: string | null;
  weight: number | null;
  slug: string;
  sellerId: number;
  categoryId: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product with relations
export interface ProductWithRelations extends Product {
  seller?: SellerSummary;
  category?: CategorySummary;
  rating?: number;
  totalReviews?: number;
  _count?: {
    orderItems: number;
    reviews: number;
  };
  totalRevenue?: number;
}

// Product summary
export interface ProductSummary {
  id: number;
  name: string;
  price: number;
  thumbnail: string | null;
  slug: string;
  stock: number;
  isActive: boolean;
}

// Create product DTO
export interface CreateProductDto {
  name: string;
  nameTetum?: string;
  description: string;
  descriptionTetum?: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  stock: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  categoryId: number;
  isActive?: boolean;
  isFeatured?: boolean;
  slug?: string;
}

// Update product DTO
export interface UpdateProductDto {
  name?: string;
  nameTetum?: string;
  description?: string;
  descriptionTetum?: string;
  price?: number;
  comparePrice?: number;
  cost?: number;
  stock?: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  categoryId?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  slug?: string;
}

// Product filter params
export interface ProductFilterParams {
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
  isActive?: boolean;
  minRating?: number;
}

// Bulk action types
export type BulkActionType = 
  | 'activate' 
  | 'deactivate' 
  | 'delete'
  | 'set-stock'
  | 'increase-stock'
  | 'decrease-stock'
  | 'set-price'
  | 'increase-price'
  | 'decrease-price';

export interface BulkActionDto {
  productIds: number[];
  action: BulkActionType;
  value?: number;
}

// Product statistics
export interface ProductStats {
  total: number;
  active: number;
  outOfStock: number;
  lowStock: number;
  activeRate: number;
  totalValue: number;
  averagePrice: number;
}

// Stock alert
export interface StockAlert {
  productId: number;
  productName: string;
  currentStock: number;
  threshold: number;
  sellerId: number;
  sellerName: string;
}

// Product review
export interface ProductReview {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  isApproved: boolean;
  helpfulCount: number;
  sellerReply: string | null;
  sellerReplyAt: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
  };
}