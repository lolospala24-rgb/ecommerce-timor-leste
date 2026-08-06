// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error response
export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  errors?: string[];
  code?: string;
  timestamp: string;
  path?: string;
}

// Request options
export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

// Upload options
export interface UploadOptions {
  onProgress?: (progress: number) => void;
  fieldName?: string;
}

// Query params
export interface QueryParams {
  [key: string]: string | number | boolean | undefined | null;
}

// Sort options
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// Filter options
export interface FilterOptions {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: any;
}

// Date range filter
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// Search options
export interface SearchOptions {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
}