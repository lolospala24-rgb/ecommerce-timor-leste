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
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    STATS: '/users/stats',
  },
  SELLERS: {
    BASE: '/sellers',
    MY_STORE: '/sellers/my-store',
    PENDING: '/sellers/pending',
    VERIFIED: '/sellers/verified',
    VERIFY: (id: number) => `/sellers/${id}/verify`,
    REJECT: (id: number) => `/sellers/${id}/reject`,
    UPLOAD_LOGO: '/sellers/upload-logo',
    UPLOAD_BANNER: '/sellers/upload-banner',
  },
  PRODUCTS: {
    BASE: '/products',
    FEATURED: '/products/featured',
    NEW_ARRIVALS: '/products/new-arrivals',
    BEST_SELLERS: '/products/best-sellers',
    MY_PRODUCTS: '/products/my-products',
    SEARCH: '/products/search',
    TOGGLE_STATUS: (id: number) => `/products/${id}/toggle-status`,
    CLONE: (id: number) => `/products/${id}/clone`,
    BULK_ACTIONS: '/products/bulk-actions',
  },
  CATEGORIES: {
    BASE: '/categories',
    TREE: '/categories/tree',
    FEATURED: '/categories/featured',
    WITH_PRODUCTS: '/categories/with-products',
    MENU: '/categories/menu',
    TOGGLE_FEATURED: (id: number) => `/categories/${id}/featured`,
    REORDER: '/categories/reorder',
  },
  ORDERS: {
    BASE: '/orders',
    MY_ORDERS: '/orders/my-orders',
    SELLER_ORDERS: '/orders/seller/orders',
    STATS: '/orders/stats',
    TRACKING: (trackingNumber: string) => `/orders/tracking/${trackingNumber}`,
    INVOICE: (id: number) => `/orders/invoice/${id}`,
    UPDATE_STATUS: (id: number) => `/orders/${id}/status`,
    CANCEL: (id: number) => `/orders/${id}/cancel`,
    CONFIRM_DELIVERY: (id: number) => `/orders/${id}/confirm-delivery`,
    REQUEST_REFUND: (id: number) => `/orders/${id}/request-refund`,
  },
  PAYMENTS: {
    BASE: '/payments',
    MY_PAYMENTS: '/payments/my-payments',
    PENDING: '/payments/pending',
    STATS: '/payments/stats',
    UPLOAD_PROOF: '/payments/upload-proof',
    CONFIRM: (id: number) => `/payments/${id}/confirm`,
    REJECT: (id: number) => `/payments/${id}/reject`,
    REFUND: (id: number) => `/payments/${id}/refund`,
  },
  ADDRESSES: {
    BASE: '/addresses',
    PRIMARY: '/addresses/primary',
    TIMOR_MUNICIPALITIES: '/addresses/timor/municipalities',
    TIMOR_POSTOS: (municipality: string) => `/addresses/timor/municipalities/${municipality}/postos`,
    TIMOR_SUCOS: (municipality: string, posto: string) => `/addresses/timor/municipalities/${municipality}/postos/${posto}/sucos`,
  },
  CARTS: {
    BASE: '/carts',
    COUNT: '/carts/count',
    TOTAL: '/carts/total',
    ADD: '/carts/add',
    UPDATE: '/carts/update',
    CLEAR: '/carts/clear',
    MERGE: '/carts/merge',
  },
  REVIEWS: {
    BASE: '/reviews',
    MY_REVIEWS: '/reviews/my-reviews',
    SELLER_REVIEWS: '/reviews/seller',
    PENDING: '/reviews/pending',
    STATS: '/reviews/stats',
    PRODUCT_STATS: (productId: number) => `/reviews/product/${productId}/stats`,
    APPROVE: (id: number) => `/reviews/${id}/approve`,
    REJECT: (id: number) => `/reviews/${id}/reject`,
    HELPFUL: (id: number) => `/reviews/${id}/helpful`,
    REPORT: (id: number) => `/reviews/${id}/report`,
    REPLY: (id: number) => `/reviews/${id}/reply`,
  },
  DASHBOARD: {
    ADMIN: '/dashboard/admin',
    ADMIN_REVENUE: '/dashboard/admin/revenue',
    ADMIN_ORDERS: '/dashboard/admin/orders',
    TOP_PRODUCTS: '/dashboard/admin/top-products',
    TOP_SELLERS: '/dashboard/admin/top-sellers',
    RECENT_ACTIVITY: '/dashboard/admin/recent-activity',
    SELLER: '/dashboard/seller',
    SELLER_SALES: '/dashboard/seller/sales',
    SELLER_PRODUCTS: '/dashboard/seller/products',
    SELLER_ORDERS: '/dashboard/seller/orders',
    SELLER_REVIEWS: '/dashboard/seller/reviews',
    CUSTOMER: '/dashboard/customer',
    CUSTOMER_ORDERS: '/dashboard/customer/orders',
    CUSTOMER_WISHLIST: '/dashboard/customer/wishlist',
    CUSTOMER_RECENT: '/dashboard/customer/recent-products',
    PUBLIC_STATS: '/dashboard/public/stats',
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    UNREAD_COUNT: '/notifications/unread/count',
    READ_ALL: '/notifications/read-all',
    CLEAR_ALL: '/notifications/clear/all',
    BROADCAST: '/notifications/broadcast',
  },
  SEARCH: {
    BASE: '/search',
    PRODUCTS: '/search/products',
    SELLERS: '/search/sellers',
    CATEGORIES: '/search/categories',
    ORDERS: '/search/orders',
    USERS: '/search/users',
    ADVANCED: '/search/advanced',
    AUTOCOMPLETE: '/search/autocomplete',
    TRENDING: '/search/trending',
    RECENT: '/search/recent',
    SUGGESTIONS: '/search/suggestions',
    FILTERS: '/search/filters',
  },
  REPORTS: {
    SALES: '/reports/sales',
    SELLERS: '/reports/sellers',
    PRODUCTS: '/reports/products',
    EXPORT: (type: string) => `/reports/${type}/export`,
  },
  SETTINGS: {
    GET: '/admin/settings',
    UPDATE: '/admin/settings',
    SHIPPING: '/shipping-settings',
    CLEAR_CACHE: '/admin/settings/clear-cache',
    CLEAR_LOGS: '/admin/settings/clear-logs',
    TEST_EMAIL: '/admin/settings/test-email',
    PUBLIC: '/settings/public',
  },
  UPLOAD: {
    IMAGES: '/upload/images',
    FILE: '/upload/file',
  },
};

// Order Status
export const ORDER_STATUS = {
  PENDING: { value: 'PENDING', label: 'Pending', color: 'bg-yellow-500' },
  PAID: { value: 'PAID', label: 'Paid', color: 'bg-blue-500' },
  PROCESSING: { value: 'PROCESSING', label: 'Processing', color: 'bg-purple-500' },
  SHIPPING: { value: 'SHIPPING', label: 'Shipping', color: 'bg-indigo-500' },
  DELIVERED: { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-500' },
  CANCELLED: { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: { value: 'PENDING', label: 'Pending', color: 'bg-yellow-500' },
  PAID: { value: 'PAID', label: 'Paid', color: 'bg-green-500' },
  FAILED: { value: 'FAILED', label: 'Failed', color: 'bg-red-500' },
  REFUNDED: { value: 'REFUNDED', label: 'Refunded', color: 'bg-orange-500' },
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  COD: { value: 'COD', label: 'Cash on Delivery' },
  BANK_TRANSFER: { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: { value: 'ADMIN', label: 'Admin', color: 'bg-red-500' },
  SELLER: { value: 'SELLER', label: 'Seller', color: 'bg-blue-500' },
  CUSTOMER: { value: 'CUSTOMER', label: 'Customer', color: 'bg-green-500' },
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  PAGE_SIZES: [10, 20, 50, 100],
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  TIME: 'HH:mm',
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
} as const;

// Cache keys
export const CACHE_KEYS = {
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  CART: 'cart',
  USER: 'user',
  NOTIFICATIONS: 'notifications',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  CART: 'cart',
  RECENT_SEARCHES: 'recent_searches',
} as const;

// Timor-Leste Municipalities
export const TIMOR_MUNICIPALITIES = [
  'Aileu', 'Ainaro', 'Baucau', 'Bobonaro', 'Covalima', 'Dili',
  'Ermera', 'Lautém', 'Liquiçá', 'Manatuto', 'Manufahi', 'Oecusse', 'Viqueque',
] as const;

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#10b981',
  DANGER: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#8b5cf6',
  GRAY: '#6b7280',
} as const;

// Toast durations
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
} as const;