import { Controller, Get, Post, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { StockNotificationsService } from './stock-notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Nested under the product it concerns, mirroring how the frontend always
// has a productId in scope (product card / product detail page) when it
// needs any of these three actions — no reason to make the caller pass it
// twice via a separate top-level resource.
@Controller('products/:productId/notify-me')
export class StockNotificationsController {
  constructor(private readonly stockNotificationsService: StockNotificationsService) {}

  @Get()
  async getStatus(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser('id') userId: number,
  ) {
    const data = await this.stockNotificationsService.getStatus(userId, productId);
    return { data };
  }

  @Post()
  async subscribe(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser('id') userId: number,
  ) {
    const data = await this.stockNotificationsService.subscribe(userId, productId);
    return { message: 'You will be notified when this product is back in stock', data };
  }

  @Delete()
  async unsubscribe(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser('id') userId: number,
  ) {
    const data = await this.stockNotificationsService.unsubscribe(userId, productId);
    return { message: 'Notification subscription removed', data };
  }
}
