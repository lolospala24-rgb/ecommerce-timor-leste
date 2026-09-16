import { Module } from '@nestjs/common';
import { ProductTypeRequestsController } from './product-type-requests.controller';
import { ProductTypeRequestsService } from './product-type-requests.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ProductTypeRequestsController],
  providers: [ProductTypeRequestsService],
})
export class ProductTypeRequestsModule {}
