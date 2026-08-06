// placeholder for src/modules/dashboard/dto/seller-dashboard.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class SellerDashboardQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class SellerDashboardResponseDto {
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
  recentOrders: any[];
  monthlySales: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  timestamp: string;
}