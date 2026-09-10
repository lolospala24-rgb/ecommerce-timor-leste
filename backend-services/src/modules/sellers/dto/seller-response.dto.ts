export class SellerResponseDto {
  id: number;
  userId: number;
  storeName: string;
  storePhone: string;
  storeEmail: string | null;
  storeAddress: string;
  storeLatitude: number | null;
  storeLongitude: number | null;
  storeLogo: string | null;
  storeBanner: string | null;
  description: string | null;
  originMunicipality: string | null;
  originPostoAdmin: string | null;
  originSuco: string | null;
  originAldeia: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;

  // User info
  user?: {
    id: number;
    email: string;
    name: string;
    phone: string | null;
  };

  // Stats
  _count?: {
    products: number;
    orders: number;
  };
  
  rating?: number;
  totalReviews?: number;
}