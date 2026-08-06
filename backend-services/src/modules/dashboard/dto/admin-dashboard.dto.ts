// placeholder for src/modules/dashboard/dto/admin-dashboard.dto.ts
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class AdminDashboardQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'year'])
  period?: 'day' | 'week' | 'month' | 'year';
}

export class AdminDashboardResponseDto {
  overview: {
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
  };
  recentOrders: any[];
  timestamp: string;
}