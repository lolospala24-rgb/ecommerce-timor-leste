import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { SettingsModule } from '../settings/settings.module';
import { StockNotificationsModule } from '../stock-notifications/stock-notifications.module';

@Module({
  imports: [PrismaModule, RedisModule, CloudinaryModule, SettingsModule, StockNotificationsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}