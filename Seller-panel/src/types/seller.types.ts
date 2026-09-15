export interface SellerStore {
  id: number;
  userId: number;
  storeName: string;
  storePhone: string | null;
  storeEmail: string | null;
  storeAddress: string | null;
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
  verifiedAt: string | null;
  verifiedBy: number | null;
  rejectionReason: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    name: string;
    phone: string | null;
  };
}

export interface UpdateSellerStoreDto {
  storeName?: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  storeLatitude?: number;
  storeLongitude?: number;
  description?: string;
  storeLogo?: string;
  storeBanner?: string;
  originMunicipality?: string;
  originPostoAdmin?: string;
  originSuco?: string;
  originAldeia?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
}
