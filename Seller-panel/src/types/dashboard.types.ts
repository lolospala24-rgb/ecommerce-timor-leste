export interface SellerDashboard {
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
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customerId: number;
    sellerId: number;
    status: string;
    shippingStatus: string;
    total: number;
    createdAt: string;
    customer: { name: string };
    items: Array<{ quantity: number; price: number; total: number; product: { name: string; thumbnail: string | null } }>;
  }>;
  monthlySales: Array<{ month: string; revenue: number; orders: number }>;
  timestamp: string;
}

export interface SellerSalesSeries {
  period: 'day' | 'week' | 'month' | 'year';
  totalRevenue: number;
  totalOrders: number;
  data: Array<{ period: string; revenue: number; orders: number }>;
}
