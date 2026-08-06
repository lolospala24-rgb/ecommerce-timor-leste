export interface Category {
  id: number;
  name: string;
  nameTetum?: string | null;
  description?: string | null;
  image?: string | null;
  banner?: string | null;
  slug: string;
  parentId?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  order?: number;
  productCount?: number;
  filterConfig?: CategoryFilterDefinition[];
  parent?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  children?: CategoryChild[];
  ancestors?: Pick<Category, 'id' | 'name' | 'slug'>[];
}

export interface CategoryChild {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number;
}

export type CategoryFilterType =
  | 'multiselect'
  | 'select'
  | 'range'
  | 'boolean'
  | 'rating'
  | 'subcategory';

export interface CategoryFilterDefinition {
  key: string;
  label: string;
  type: CategoryFilterType;
  source: string;
  field?: string;
  options?: string[];
  order?: number;
}

export interface CategoryFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface CategoryFilterFacet {
  key: string;
  label: string;
  type: CategoryFilterType;
  source: string;
  field?: string;
  options?: CategoryFilterOption[];
  min?: number;
  max?: number;
  order?: number;
}

export interface CategorySortOption {
  value: string;
  label: string;
}

export interface CategoryFiltersResponse {
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  filters: CategoryFilterFacet[];
  sortOptions: CategorySortOption[];
}

export interface CategoryListingFilters {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  subcategoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  brand?: string[];
  attributes: Record<string, string[]>;
}

export interface CategoryProductsResponse {
  data: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
