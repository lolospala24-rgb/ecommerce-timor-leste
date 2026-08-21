import { Module } from '@nestjs/common';
import { StockNotificationsService } from './stock-notifications.service';
import { StockNotificationsController } from './stock-notifications.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [StockNotificationsController],
  providers: [StockNotificationsService],
  exports: [StockNotificationsService],
})
export class StockNotificationsModule {}
