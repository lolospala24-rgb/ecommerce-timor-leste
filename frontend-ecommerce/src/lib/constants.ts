// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  PRODUCTS: {
    BASE: '/products',
    FEATURED: '/products/featured',
    NEW_ARRIVALS: '/products/new-arrivals',
    BEST_SELLERS: '/products/best-sellers',
    LOCAL: '/products/local',
    SEARCH: '/products/search',
    RELATED: (id: number) => `/products/${id}/related`,
    SELLER: (id: number) => `/products/seller/${id}`,
  },
  CATEGORIES: {
    BASE: '/categories',
    TREE: '/categories/tree',
    FEATURED: '/categories/featured',
    SLUG: (slug: string) => `/categories/slug/${slug}`,
    FILTERS: (slug: string) => `/categories/slug/${slug}/filters`,
    PRODUCTS_BY_SLUG: (slug: string) => `/categories/slug/${slug}/products`,
    PRODUCTS: (id: number) => `/categories/${id}/products`,
  },
  CART: {
    BASE: '/carts',
    ADD: '/carts/add',
    UPDATE: '/carts/update',
    CLEAR: '/carts/clear',
    ITEM: (id: number) => `/carts/${id}`,
  },
  ORDERS: {
    BASE: '/orders',
    MY_ORDERS: '/orders/my-orders',
    STATS: '/orders/stats',
    CANCEL: (id: number) => `/orders/${id}/cancel`,
  },
  ADDRESSES: {
    BASE: '/addresses',
    PRIMARY: '/addresses/primary',
    TIMOR_MUNICIPALITIES: '/addresses/timor/municipalities',
    TIMOR_POSTOS: (municipality: string) => `/addresses/timor/municipalities/${municipality}/postos`,
    TIMOR_SUCOS: (municipality: string, posto: string) => `/addresses/timor/municipalities/${municipality}/postos/${posto}/sucos`,
  },
  SELLERS: {
    BASE: '/sellers',
    TOP: '/sellers/top',
  },
  REVIEWS: {
    BASE: '/reviews',
    PRODUCT: (id: number) => `/reviews/product/${id}`,
    CREATE: '/reviews',
  },
};

// Order Status
export const ORDER_STATUS = {
  PENDING: { value: 'PENDING', label: 'Pending', color: 'bg-amber-500' },
  PAID: { value: 'PAID', label: 'Paid', color: 'bg-green-600' },
  PROCESSING: { value: 'PROCESSING', label: 'Processing', color: 'bg-blue-600' },
  SHIPPING: { value: 'SHIPPING', label: 'In Transit', color: 'bg-blue-600' },
  DELIVERED: { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-600' },
  CANCELLED: { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-600' },
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: { value: 'PENDING', label: 'Pending', color: 'bg-amber-500' },
  PAID: { value: 'PAID', label: 'Paid', color: 'bg-green-600' },
  FAILED: { value: 'FAILED', label: 'Failed', color: 'bg-red-600' },
  REFUNDED: { value: 'REFUNDED', label: 'Refunded', color: 'bg-slate-500' },
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  COD: { value: 'COD', label: 'Cash on Delivery' },
  BANK_TRANSFER: { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: { value: 'ADMIN', label: 'Admin' },
  SELLER: { value: 'SELLER', label: 'Seller' },
  CUSTOMER: { value: 'CUSTOMER', label: 'Customer' },
} as const;

// Timor-Leste Municipalities
export const TIMOR_MUNICIPALITIES = [
  'Aileu', 'Ainaro', 'Baucau', 'Bobonaro', 'Covalima', 'Dili',
  'Ermera', 'Lautém', 'Liquiçá', 'Manatuto', 'Manufahi', 'Oecusse', 'Viqueque',
] as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 12,
  PAGE_SIZES: [12, 24, 48, 96],
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  API: 'yyyy-MM-dd',
  TIME: 'HH:mm',
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  CART: 'cart',
  WISHLIST: 'wishlist',
  GUEST_CART: 'guest_cart',
  RECENT_SEARCHES: 'recent_searches',
} as const;

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#10b981',
  DANGER: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#8b5cf6',
  GRAY: '#6b7280',
} as const;