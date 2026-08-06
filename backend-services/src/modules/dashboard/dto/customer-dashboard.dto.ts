// placeholder for src/modules/dashboard/dto/customer-dashboard.dto.ts
export class CustomerDashboardResponseDto {
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
  recentOrders: any[];
  timestamp: string;
}