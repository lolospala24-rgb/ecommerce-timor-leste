import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(Role.ADMIN)
  async getAdminDashboard(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getAdminDashboard({
      period,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('admin/revenue')
  @Roles(Role.ADMIN)
  async getAdminRevenue(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    return this.dashboardService.getAdminRevenue(period);
  }

  @Get('admin/orders')
  @Roles(Role.ADMIN)
  async getAdminOrders(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    return this.dashboardService.getAdminOrders(period);
  }

  @Get('admin/top-products')
  @Roles(Role.ADMIN)
  async getTopProducts(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.dashboardService.getTopProducts(limit, period);
  }

  @Get('admin/top-sellers')
  @Roles(Role.ADMIN)
  async getTopSellers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getTopSellers(limit);
  }

  @Get('admin/recent-activity')
  @Roles(Role.ADMIN)
  async getRecentActivity(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getRecentActivity(limit);
  }

  @Get('seller')
  @Roles(Role.SELLER)
  async getSellerDashboard(
    @CurrentUser('id') userId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSellerDashboard(userId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('seller/sales')
  @Roles(Role.SELLER)
  async getSellerSales(
    @CurrentUser('id') userId: number,
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    return this.dashboardService.getSellerSales(userId, period);
  }

  @Get('customer')
  async getCustomerDashboard(@CurrentUser('id') userId: number) {
    return this.dashboardService.getCustomerDashboard(userId);
  }

  @Public()
  @Get('public/stats')
  async getPublicStats() {
    return this.dashboardService.getPublicStats();
  }
}