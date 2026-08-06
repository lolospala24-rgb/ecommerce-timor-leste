import { Role } from '@prisma/client';

export class UserResponseDto {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional relations
  seller?: {
    id: number;
    storeName: string;
    isVerified: boolean;
  };
  
  _count?: {
    orders: number;
    reviews: number;
  };
}