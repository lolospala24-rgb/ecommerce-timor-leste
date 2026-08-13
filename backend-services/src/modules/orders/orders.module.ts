import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { MailModule } from '../../mail/mail.module';
import { ProductsModule } from '../products/products.module';
import { CartsModule } from '../carts/carts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShippingModule } from '../shipping/shipping.module';
import { SettingsModule } from '../settings/settings.module';
import { FinanceModule } from '../finance/finance.module';
import { PaymentExpiryJob } from './payment-expiry.job';

@Module({
  imports: [PrismaModule, RedisModule, MailModule, ProductsModule, CartsModule, NotificationsModule, ShippingModule, SettingsModule, FinanceModule],
  controllers: [OrdersController],
  providers: [OrdersService, PaymentExpiryJob],
  exports: [OrdersService],
})
export class OrdersModule {}