// placeholder for src/modules/carts/entities/cart.entity.ts
import { Cart, CartItem, Product } from '@prisma/client';

export class CartEntity implements Cart {
  id: number;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Additional fields
  items?: (CartItem & { product: Product })[];
  summary?: {
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    totalItems: number;
    sellerGroups: any[];
  };

  constructor(partial: Partial<CartEntity>) {
    Object.assign(this, partial);
  }

  // Get total number of items in cart
  getTotalItems(): number {
    if (!this.items) return 0;
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Get subtotal of all items
  getSubtotal(): number {
    if (!this.items) return 0;
    return this.items.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);
  }

  // Check if cart is empty
  isEmpty(): boolean {
    return !this.items || this.items.length === 0;
  }

  // Get item count for specific product
  getProductQuantity(productId: number): number {
    const item = this.items?.find(i => i.productId === productId);
    return item?.quantity || 0;
  }

  // Check if cart contains product
  hasProduct(productId: number): boolean {
    return this.items?.some(i => i.productId === productId) || false;
  }

  // Get unique seller count
  getSellerCount(): number {
    if (!this.items) return 0;
    const sellerIds = new Set(this.items.map(i => i.product.sellerId));
    return sellerIds.size;
  }

  // Get items grouped by seller
  getItemsBySeller(): Map<number, (CartItem & { product: Product })[]> {
    const grouped = new Map();
    if (!this.items) return grouped;
    
    for (const item of this.items) {
      const sellerId = item.product.sellerId;
      if (!grouped.has(sellerId)) {
        grouped.set(sellerId, []);
      }
      grouped.get(sellerId).push(item);
    }
    
    return grouped;
  }

  // Calculate estimated shipping cost
  getEstimatedShippingCost(): number {
    const sellerCount = this.getSellerCount();
    return sellerCount * 2.5; // $2.50 per seller
  }

  // Get total with shipping
  getTotalWithShipping(): number {
    return this.getSubtotal() + this.getEstimatedShippingCost();
  }

  // Check if cart is expired
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Get formatted subtotal
  getFormattedSubtotal(): string {
    return `$${this.getSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Get formatted total
  getFormattedTotal(): string {
    return `$${this.getTotalWithShipping().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Get expiration warning (if near expiry)
  getExpirationWarning(): string | null {
    if (this.isExpired()) {
      return 'Your cart has expired';
    }
    
    const hoursLeft = (this.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursLeft < 24) {
      return `Your cart will expire in ${Math.round(hoursLeft)} hours`;
    }
    
    return null;
  }
}