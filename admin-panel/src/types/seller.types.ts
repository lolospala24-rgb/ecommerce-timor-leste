import type { UserSummary } from './user.types';
import type { ProductSummary } from './product.types';
import type { OrderSummary } from './order.types';

// Seller interface
export interface Seller {
  id: number;
  userId: number;
  storeName: string;
  storePhone: string;
  storeEmail: string | null;
  storeAddress: string;
  storeLogo: string | null;
  storeBanner: string | null;
  description: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: number | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// Seller with relations
export interface SellerWithRelations extends Seller {
  user?: UserSummary;
  products?: ProductSummary[];
  orders?: OrderSummary[];
  _count?: {
    products: number;
    orders: number;
  };
  rating?: number;
  totalReviews?: number;
  totalRevenue?: number;
}

// Seller summary
export interface SellerSummary {
  id: number;
  storeName: string;
  storeLogo: string | null;
  isVerified: boolean;
}

// Register seller DTO
export interface RegisterSellerDto {
  email: string;
  password: string;
  name: string;
  phone: string;
  storeName: string;
  storePhone: string;
  storeEmail?: string;
  storeAddress: string;
  description?: string;
}

// Update seller DTO
export interface UpdateSellerDto {
  storeName?: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  description?: string;
}

// Verify seller DTO
export interface VerifySellerDto {
  isApproved: boolean;
  rejectionReason?: string;
}

// Seller filter params
export interface SellerFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  isVerified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Seller statistics
export interface SellerStats {
  total: number;
  verified: number;
  pending: number;
  products: number;
  orders: number;
  revenue: number;
  verificationRate: number;
}

// Seller performance
export interface SellerPerformance {
  sellerId: number;
  storeName: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  rating: number;
  growth: number;
}

// Store settings
export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeEmail: string | null;
  storeAddress: string;
  description: string | null;
  storeLogo: string | null;
  storeBanner: string | null;
}

// Store verification status
export interface VerificationStatus {
  isVerified: boolean;
  verifiedAt: string | null;
  rejectionReason: string | null;
  canResubmit: boolean;
}