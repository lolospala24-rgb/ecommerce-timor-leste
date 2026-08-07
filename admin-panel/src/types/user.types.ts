import type { OrderSummary } from './order.types';
import type { ReviewSummary } from './review.types';
import type { SellerSummary } from './seller.types';

// User role types
export type UserRole = 'ADMIN' | 'SELLER' | 'CUSTOMER';

// User status types
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

// User interface
export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// User with relations
export interface UserWithRelations extends User {
  seller?: SellerSummary;
  customerAddress?: Address[];
  orders?: OrderSummary[];
  reviews?: ReviewSummary[];
  totalSpent?: number;
  _count?: {
    orders: number;
    reviews: number;
    notifications: number;
  };
}

// User summary (for lists)
export interface UserSummary {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

// Create user DTO
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
  emailVerified?: boolean;
}

// Update user DTO
export interface UpdateUserDto {
  email?: string;
  name?: string;
  phone?: string;
}

// Change password DTO
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// Login DTO
export interface LoginDto {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Register DTO
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

// Forgot password DTO
export interface ForgotPasswordDto {
  email: string;
}

// Reset password DTO
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// Verify email DTO
export interface VerifyEmailDto {
  token: string;
}

// User filter params
export interface UserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// User statistics
export interface UserStats {
  total: number;
  active: number;
  verified: number;
  byRole: {
    admin: number;
    seller: number;
    customer: number;
  };
  newUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

// Address types
export interface Address {
  id: number;
  userId: number;
  label: string | null;
  municipality: string;
  postoAdmin: string;
  suco: string;
  village: string | null;
  street: string | null;
  reference: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create address DTO
export interface CreateAddressDto {
  label?: string;
  municipality: string;
  postoAdmin: string;
  suco: string;
  village?: string;
  street?: string;
  reference?: string;
  phone?: string;
  isPrimary?: boolean;
}

// Update address DTO
export interface UpdateAddressDto {
  label?: string;
  municipality?: string;
  postoAdmin?: string;
  suco?: string;
  village?: string;
  street?: string;
  reference?: string;
  phone?: string;
  isPrimary?: boolean;
}