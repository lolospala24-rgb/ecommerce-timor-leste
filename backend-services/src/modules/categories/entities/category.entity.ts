// placeholder for src/modules/categories/entities/category.entity.ts
import { Category, Prisma } from '@prisma/client';

export class CategoryEntity implements Category {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string | null;
  image: string | null;
  banner: string | null;
  filterConfig: Prisma.JsonValue | null;
  slug: string;
  parentId: number | null;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;

  // Additional fields for relationships
  children?: CategoryEntity[];
  parent?: CategoryEntity | null;
  productCount?: number;

  constructor(partial: Partial<CategoryEntity>) {
    Object.assign(this, partial);
  }

  // Get display name (prefer Tetun if available)
  getDisplayName(preferTetun: boolean = true): string {
    if (preferTetun && this.nameTetum) {
      return this.nameTetum;
    }
    return this.name;
  }

  // Get full path/breadcrumb
  getPath(ancestors: CategoryEntity[] = []): string {
    const names = [...ancestors, this].map(c => c.name);
    return names.join(' > ');
  }

  // Check if category has children
  hasChildren(): boolean {
    return this.children ? this.children.length > 0 : false;
  }

  // Check if category is active
  isActiveCategory(): boolean {
    return this.isActive;
  }

  // Check if category is featured
  isFeaturedCategory(): boolean {
    return this.isFeatured;
  }

  // Get product count (if loaded)
  getProductCount(): number {
    return this.productCount || 0;
  }

  // Get URL slug
  getUrl(): string {
    return `/categories/${this.slug}`;
  }

  // Get image URL with default fallback
  getImageUrl(fallback?: string): string | null {
    return this.image || fallback || null;
  }

  // Check if category is top-level
  isTopLevel(): boolean {
    return this.parentId === null;
  }

  // Get hierarchy level (0 for top-level)
  async getLevel(): Promise<number> {
    let level = 0;
    let current = this;
    while (current.parentId) {
      level++;
      // Would need to fetch parent to continue, but this is a static method
      break;
    }
    return level;
  }
}