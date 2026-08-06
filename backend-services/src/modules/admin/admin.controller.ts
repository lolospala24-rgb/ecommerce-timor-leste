// placeholder for src/modules/admin/admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApproveSellerDto } from './dto/approve-seller.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { SystemSettingsDto } from './dto/system-settings.dto';
import { AdminStatsQueryDto } from './dto/admin-stats.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard Stats
  @Get('dashboard')
  async getDashboardStats(@Query() query: AdminStatsQueryDto) {
    const stats = await this.adminService.getDashboardStats(query);
    return { data: stats };
  }

  @Get('dashboard/revenue')
  async getRevenueStats(@Query('period') period?: string) {
    const stats = await this.adminService.getRevenueStats(period);
    return { data: stats };
  }

  @Get('dashboard/orders')
  async getOrderStats(@Query('period') period?: string) {
    const stats = await this.adminService.getOrderStats(period);
    return { data: stats };
  }

  // Seller Management
  @Get('sellers/pending')
  async getPendingSellers() {
    const sellers = await this.adminService.getPendingSellers();
    return { data: sellers };
  }

  @Get('sellers')
  async getAllSellers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isVerified') isVerified?: string,
  ) {
    const result = await this.adminService.getAllSellers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      isVerified: isVerified ? isVerified === 'true' : undefined,
    });
    return result;
  }

  @Get('sellers/:id')
  async getSellerDetail(@Param('id', ParseIntPipe) id: number) {
    const seller = await this.adminService.getSellerDetail(id);
    return { data: seller };
  }

  @Post('sellers/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveSeller(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveSellerDto: ApproveSellerDto,
    @CurrentUser('id') adminId: number,
  ) {
    const seller = await this.adminService.approveSeller(
      id,
      approveSellerDto,
      adminId,
    );
    return { message: 'Seller approved successfully', data: seller };
  }

  @Post('sellers/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectSeller(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: number,
  ) {
    const seller = await this.adminService.rejectSeller(id, reason, adminId);
    return { message: 'Seller rejected', data: seller };
  }

  @Delete('sellers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSeller(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteSeller(id);
  }

  // User Management
  @Get('users')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const result = await this.adminService.getAllUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      role,
      isActive: isActive ? isActive === 'true' : undefined,
    });
    return result;
  }

  @Get('users/:id')
  async getUserDetail(@Param('id', ParseIntPipe) id: number) {
    const user = await this.adminService.getUserDetail(id);
    return { data: user };
  }

  @Post('users/:id/block')
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() blockUserDto: BlockUserDto,
    @CurrentUser('id') adminId: number,
  ) {
    const user = await this.adminService.blockUser(id, blockUserDto, adminId);
    return { message: 'User blocked successfully', data: user };
  }

  @Post('users/:id/unblock')
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
  ) {
    const user = await this.adminService.unblockUser(id, adminId);
    return { message: 'User unblocked successfully', data: user };
  }

  @Patch('users/:id/role')
  async changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: Role,
    @CurrentUser('id') adminId: number,
  ) {
    const user = await this.adminService.changeUserRole(id, role, adminId);
    return { message: 'User role updated', data: user };
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteUser(id);
  }

  // Product Management
  @Get('products')
  async getAllProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    const result = await this.adminService.getAllProducts({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      sellerId: sellerId ? parseInt(sellerId) : undefined,
    });
    return result;
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteProduct(id);
  }

  @Post('products/:id/featured')
  @HttpCode(HttpStatus.OK)
  async toggleFeatured(
    @Param('id', ParseIntPipe) id: number,
    @Body('isFeatured') isFeatured: boolean,
  ) {
    const product = await this.adminService.toggleFeatured(id, isFeatured);
    return { message: 'Product featured status updated', data: product };
  }

  // Order Management
  @Get('orders')
  async getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.adminService.getAllOrders({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
    });
    return result;
  }

  @Get('orders/:id')
  async getOrderDetail(@Param('id', ParseIntPipe) id: number) {
    const order = await this.adminService.getOrderDetail(id);
    return { data: order };
  }

  // System Settings (read-only public config for storefront)
  @Public()
  @Get('settings')
  async getSystemSettings() {
    const settings = await this.adminService.getSystemSettings();
    return { data: settings };
  }

  @Post('settings')
  async updateSystemSettings(@Body() settingsDto: SystemSettingsDto) {
    const settings = await this.adminService.updateSystemSettings(settingsDto);
    return { message: 'Settings updated successfully', data: settings };
  }

  // Admin Logs
  @Get('logs')
  async getAdminLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    const result = await this.adminService.getAdminLogs({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      action,
    });
    return result;
  }

  @Get('logs/actions')
  async getDistinctActions() {
    const actions = await this.adminService.getDistinctActions();
    return { data: actions };
  }

  // Reports
  @Get('reports/sales')
  async getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: 'day' | 'month' | 'year',
  ) {
    const report = await this.adminService.getSalesReport({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      groupBy,
    });
    return { data: report };
  }

  @Get('reports/top-sellers')
  async getTopSellers(@Query('limit') limit?: string) {
    const sellers = await this.adminService.getTopSellers(limit ? parseInt(limit) : 10);
    return { data: sellers };
  }

  @Get('reports/top-products')
  async getTopProducts(@Query('limit') limit?: string) {
    const products = await this.adminService.getTopProducts(limit ? parseInt(limit) : 10);
    return { data: products };
  }

  @Get('reports/categories')
  async getCategoryReport() {
    const report = await this.adminService.getCategoryReport();
    return { data: report };
  }

  // Export Data
  @Post('export/users')
  async exportUsers(@Body('format') format: 'csv' | 'excel' = 'csv') {
    const data = await this.adminService.exportUsers(format);
    return { data };
  }

  @Post('export/orders')
  async exportOrders(
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('format') format: 'csv' | 'excel' = 'csv',
  ) {
    const data = await this.adminService.exportOrders({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      format,
    });
    return { data };
  }
}