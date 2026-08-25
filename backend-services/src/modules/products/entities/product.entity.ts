// placeholder for src/modules/products/entities/product.entity.ts
import { Product, Prisma } from '@prisma/client';

export class ProductEntity implements Product {
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
  brand: string | null;
  specifications: Prisma.JsonValue | null;
  slug: string;
  sellerId: number;
  categoryId: number;
  typeId: number | null;
  isActive: boolean;
  isFeatured: boolean;
  hasVariants: boolean;
  length: number | null;
  width: number | null;
  height: number | null;
  shippingClass: string | null;
  lowStockThreshold: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: Prisma.JsonValue;
  tags: Prisma.JsonValue;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  packagingName: string | null;
  packagingUnitCount: number | null;
  packagingPrice: number | null;
  createdAt: Date;
  updatedAt: Date;

  // Additional fields
  rating?: number;
  totalReviews?: number;

  constructor(partial: Partial<ProductEntity>) {
    Object.assign(this, partial);
  }

  // Get display name (prefer Tetun if available)
  getDisplayName(preferTetun: boolean = true): string {
    if (preferTetun && this.nameTetum) {
      return this.nameTetum;
    }
    return this.name;
  }

  // Get display description (prefer Tetun if available)
  getDisplayDescription(preferTetun: boolean = true): string {
    if (preferTetun && this.descriptionTetum) {
      return this.descriptionTetum;
    }
    return this.description;
  }

  // Check if product is in stock
  isInStock(): boolean {
    return this.stock > 0 && this.isActive;
  }

  // Get discount percentage
  getDiscountPercentage(): number {
    if (this.comparePrice && this.comparePrice > this.price) {
      return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
    }
    return 0;
  }

  // Check if product has discount
  hasDiscount(): boolean {
    return this.getDiscountPercentage() > 0;
  }

  // Get formatted price
  getFormattedPrice(): string {
    return `$${this.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Get formatted compare price
  getFormattedComparePrice(): string | null {
    if (this.comparePrice) {
      return `$${this.comparePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return null;
  }

  // Get product URL
  getUrl(): string {
    return `/products/${this.slug}`;
  }

  // Get primary image
  getPrimaryImage(): string | null {
    return this.thumbnail || this.images?.[0] || null;
  }

  // Get all images
  getAllImages(): string[] {
    return this.images || [];
  }

  // Get rating stars (0-5)
  getRatingStars(): number {
    return Math.round(this.rating || 0);
  }

  // Check if product is new (less than 30 days)
  isNew(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.createdAt > thirtyDaysAgo;
  }

  // Get stock status text
  getStockStatus(): string {
    const lowStockThreshold = this.lowStockThreshold ?? 5;
    if (!this.isActive) return 'Inactive';
    if (this.stock <= 0) return 'Out of Stock';
    if (this.stock <= lowStockThreshold) return 'Low Stock';
    return 'In Stock';
  }

  // Get stock status color
  getStockStatusColor(): string {
    const lowStockThreshold = this.lowStockThreshold ?? 5;
    if (!this.isActive) return 'gray';
    if (this.stock <= 0) return 'red';
    if (this.stock <= lowStockThreshold) return 'orange';
    return 'green';
  }

  // Calculate profit margin
  getProfitMargin(): number | null {
    if (this.cost && this.cost > 0) {
      return ((this.price - this.cost) / this.price) * 100;
    }
    return null;
  }

  // Format as JSON for API response
  toJSON(): any {
    const { cost, ...product } = this;
    return product;
  }
}