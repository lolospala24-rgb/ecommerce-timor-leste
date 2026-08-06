// placeholder for src/modules/sellers/entities/seller.entity.ts
import { Seller } from '@prisma/client';

export class SellerEntity implements Seller {
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
  verifiedAt: Date | null;
  verifiedBy: number | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<SellerEntity>) {
    Object.assign(this, partial);
  }

  // Check if seller is verified
  isVerifiedSeller(): boolean {
    return this.isVerified;
  }

  // Check if seller has logo
  hasLogo(): boolean {
    return !!this.storeLogo;
  }

  // Check if seller has banner
  hasBanner(): boolean {
    return !!this.storeBanner;
  }

  // Get store contact info
  getContactInfo() {
    return {
      phone: this.storePhone,
      email: this.storeEmail,
      address: this.storeAddress,
    };
  }

  // Get store display name
  getDisplayName(): string {
    return this.storeName;
  }

  // Check if store is complete (has all required info)
  isComplete(): boolean {
    return !!(
      this.storeName &&
      this.storePhone &&
      this.storeAddress &&
      this.isVerified
    );
  }
}