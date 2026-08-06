// placeholder for src/modules/users/entities/user.entity.ts
import { Role } from '@prisma/client';

export class UserEntity {
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

  // Sensitive fields that should not be exposed
  private password: string;
  private refreshToken: string | null;
  private resetToken: string | null;
  private resetExpiry: Date | null;
  private emailVerificationToken: string | null;
  private emailVerificationExpiry: Date | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  // Method to remove sensitive data
  toJSON(): any {
    const { 
      password, 
      refreshToken, 
      resetToken, 
      resetExpiry, 
      emailVerificationToken, 
      emailVerificationExpiry, 
      ...user 
    } = this;
    return user;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.role === Role.ADMIN;
  }

  // Check if user is seller
  isSeller(): boolean {
    return this.role === Role.SELLER;
  }

  // Check if user is customer
  isCustomer(): boolean {
    return this.role === Role.CUSTOMER;
  }

  // Check if account is active
  isAccountActive(): boolean {
    return this.isActive;
  }

  // Check if email is verified
  isEmailVerified(): boolean {
    return this.emailVerified;
  }
}