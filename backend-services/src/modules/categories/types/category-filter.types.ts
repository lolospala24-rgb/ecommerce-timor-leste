export type CategoryFilterType =
  | 'multiselect'
  | 'select'
  | 'range'
  | 'boolean'
  | 'rating'
  | 'subcategory';

export type CategoryFilterSource =
  | 'brand'
  | 'specification'
  | 'variant_attribute'
  | 'seller'
  | 'product_field'
  | 'subcategory'
  | 'static';

export interface CategoryFilterDefinition {
  key: string;
  label: string;
  type: CategoryFilterType;
  source: CategoryFilterSource;
  field?: string;
  options?: string[];
  order?: number;
}

export interface CategoryFilterFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface CategoryFilterFacet {
  key: string;
  label: string;
  type: CategoryFilterType;
  source: CategoryFilterSource;
  field?: string;
  options?: CategoryFilterFacetOption[];
  min?: number;
  max?: number;
  order?: number;
}

export const DEFAULT_CATEGORY_FILTERS: CategoryFilterDefinition[] = [
  {
    key: 'subcategory',
    label: 'Category',
    type: 'multiselect',
    source: 'subcategory',
    order: 0,
  },
  {
    key: 'brand',
    label: 'Brand',
    type: 'multiselect',
    source: 'brand',
    order: 1,
  },
  {
    key: 'price',
    label: 'Price',
    type: 'range',
    source: 'product_field',
    field: 'price',
    order: 2,
  },
  {
    key: 'rating',
    label: 'Rating',
    type: 'rating',
    source: 'product_field',
    order: 3,
  },
  {
    key: 'inStock',
    label: 'Availability',
    type: 'boolean',
    source: 'product_field',
    field: 'stock',
    order: 4,
  },
];
