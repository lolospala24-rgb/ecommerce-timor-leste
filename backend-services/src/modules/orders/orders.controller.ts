// placeholder for src/modules/orders/orders.controller.ts
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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { OrderOwnerGuard } from './guards/order-owner.guard';
import { Role } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser('id') userId: number,
  ) {
    const order = await this.ordersService.create(createOrderDto, userId);
    return { message: 'Order created successfully', data: order };
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
    @Query() filterDto: OrderFilterDto,
  ) {
    const result = await this.ordersService.findAll(
      userId,
      userRole,
      filterDto,
    );
    return result;
  }

  @Get('my-orders')
  async getMyOrders(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.ordersService.getUserOrders(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
    });
    return result;
  }

  @Get('seller/orders')
  @Roles(Role.SELLER)
  async getSellerOrders(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.ordersService.getSellerOrders(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
    });
    return result;
  }

  @Get('stats')
  async getOrderStats(@CurrentUser('id') userId: number) {
    const stats = await this.ordersService.getOrderStats(userId);
    return { data: stats };
  }

  @Get('shipping')
  async getShippingOverview(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    const shipments = await this.ordersService.getShippingOverview(
      userId,
      userRole,
    );
    return { data: shipments };
  }

  @Get('tracking/:trackingNumber')
  @Public()
  async trackOrder(@Param('trackingNumber') trackingNumber: string) {
    const order = await this.ordersService.trackOrder(trackingNumber);
    return { data: order };
  }

  @Get(':id')
  @UseGuards(OrderOwnerGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.findOne(id);
    return { data: order };
  }

  @Get('invoice/:id')
  @UseGuards(OrderOwnerGuard)
  async getInvoice(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.ordersService.getInvoice(id);
    return { data: invoice };
  }

  @Patch(':id/status')
  @Roles(Role.SELLER, Role.ADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    const order = await this.ordersService.updateStatus(
      id,
      updateOrderStatusDto,
      userId,
      userRole,
    );
    return { message: 'Order status updated', data: order };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body('reason') reason?: string,
  ) {
    const order = await this.ordersService.cancelOrder(id, userId, reason);
    return { message: 'Order cancelled successfully', data: order };
  }

  @Post(':id/confirm-delivery')
  @HttpCode(HttpStatus.OK)
  async confirmDelivery(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const order = await this.ordersService.confirmDelivery(id, userId);
    return { message: 'Delivery confirmed', data: order };
  }

  @Post(':id/request-refund')
  @HttpCode(HttpStatus.OK)
  async requestRefund(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body('reason') reason: string,
    @Body('amount') amount?: number,
  ) {
    const refund = await this.ordersService.requestRefund(id, userId, reason, amount);
    return { message: 'Refund request submitted', data: refund };
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  async getAllOrdersAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    const result = await this.ordersService.getAllOrdersAdmin({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      sellerId: sellerId ? parseInt(sellerId) : undefined,
    });
    return result;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.ordersService.remove(id);
  }
}