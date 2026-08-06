import type { OrderSummary } from './order.types';
import type { ProductSummary } from './product.types';

// Dashboard overview stats
export interface DashboardOverview {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    active: number;
  };
  sellers: {
    total: number;
    verified: number;
    pending: number;
    newThisMonth: number;
    verificationRate: number;
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
    activeRate: number;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipping: number;
    delivered: number;
    cancelled: number;
    revenue: number;
  };
  payments: {
    pending: number;
  };
  reviews: {
    total: number;
    pending: number;
    averageRating: number;
  };
}

// Revenue chart data
export interface RevenueDataPoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface RevenueChartData {
  period: 'day' | 'week' | 'month' | 'year';
  totalRevenue: number;
  totalOrders: number;
  data: RevenueDataPoint[];
}

// Order status distribution
export interface OrderStatusDistribution {
  status: string;
  count: number;
  revenue: number;
}

// Top product
export interface TopProduct {
  id: number;
  name: string;
  thumbnail: string | null;
  price: number;
  totalSold: number;
  totalRevenue: number;
  storeName: string;
  category?: string;
}

// Top seller
export interface TopSeller {
  id: number;
  storeName: string;
  ownerName: string;
  email: string;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  isVerified: boolean;
}

// Recent activity
export interface RecentActivity {
  type: 'order' | 'user' | 'review' | 'seller';
  action: string;
  description: string;
  timestamp: string;
  data: any;
}

// Sales by region (Timor-Leste)
export interface SalesByRegion {
  municipality: string;
  latitude: number;
  longitude: number;
  sales: number;
  orderCount: number;
}

// Seller dashboard data
export interface SellerDashboardData {
  storeInfo: {
    id: number;
    name: string;
    isVerified: boolean;
    logo: string | null;
  };
  overview: {
    orders: {
      total: number;
      pending: number;
      processing: number;
      shipping: number;
      delivered: number;
      cancelled: number;
    };
    revenue: {
      total: number;
      thisPeriod: number;
    };
    products: {
      total: number;
      active: number;
      outOfStock: number;
      lowStock: number;
    };
    reviews: {
      total: number;
      averageRating: number;
    };
  };
  recentOrders: OrderSummary[];
  monthlySales: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

// Customer dashboard data
export interface CustomerDashboardData {
  overview: {
    orders: {
      total: number;
      pending: number;
      processing: number;
      shipping: number;
      delivered: number;
      cancelled: number;
    };
    spending: {
      total: number;
      averageOrder: number;
    };
    reviews: {
      total: number;
    };
    addresses: {
      total: number;
    };
  };
  recentOrders: OrderSummary[];
  recommendedProducts?: ProductSummary[];
}

// Public stats (for homepage)
export interface PublicStats {
  totalProducts: number;
  totalSellers: number;
  totalOrders: number;
  averageRating: number;
}

// Chart dataset
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
}

// Chart configuration
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  labels: string[];
  datasets: ChartDataset[];
  options?: Record<string, any>;
}

// ============= ADD THESE MISSING TYPES =============

// Recent order for dashboard
export interface RecentOrder {
  id: number;
  orderNumber: string;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  seller: {
    id: number;
    storeName: string;
  };
  total: number;
  status: string;
  createdAt: string;
}

// Complete Dashboard Stats (for admin panel)
export interface DashboardStats {
  overview: DashboardOverview;
  recentOrders: RecentOrder[];
  timestamp: string;
  adminName?: string;
  // Additional fields for charts
  stats?: DashboardOverview;
  revenueData?: RevenueChartData;
  topProducts?: TopProduct[];
  salesByRegion?: SalesByRegion[];
}

// Admin dashboard query params
export interface AdminDashboardQuery {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

// Seller dashboard query params
export interface SellerDashboardQuery {
  startDate?: string;
  endDate?: string;
}

// Customer dashboard query params
export interface CustomerDashboardQuery {
  period?: 'week' | 'month' | 'year';
}