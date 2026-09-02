import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { AbandonedCartJob } from './abandoned-cart.job';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { ProductsModule } from '../products/products.module';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [PrismaModule, RedisModule, ProductsModule, MailModule],
  controllers: [CartsController],
  providers: [CartsService, AbandonedCartJob],
  exports: [CartsService],
})
export class CartsModule {}