// Category interface
export interface Category {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string | null;
  image: string | null;
  slug: string;
  parentId: number | null;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Category with relations
export interface CategoryWithRelations extends Category {
  parent?: CategorySummary;
  children?: Category[];
  productCount?: number;
}

// Category summary
export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
}

// Create category DTO
export interface CreateCategoryDto {
  name: string;
  nameTetum?: string;
  description?: string;
  image?: string;
  parentId?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  order?: number;
  slug?: string;
}

// Update category DTO
export interface UpdateCategoryDto {
  name?: string;
  nameTetum?: string;
  description?: string;
  image?: string;
  parentId?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  order?: number;
  slug?: string;
}

// Category filter params
export interface CategoryFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: number;
  includeProducts?: boolean;
  isActive?: boolean;
}

// Category tree node
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
  productCount: number;
}

// Category with product count
export interface CategoryWithCount extends Category {
  productCount: number;
}

// Category menu item (for frontend navigation)
export interface CategoryMenuItem {
  id: number;
  name: string;
  nameTetum: string | null;
  slug: string;
  image: string | null;
  children: CategoryMenuItem[];
  productCount: number;
}

// Reorder categories DTO
export interface ReorderCategoriesDto {
  orders: Array<{
    id: number;
    order: number;
  }>;
}