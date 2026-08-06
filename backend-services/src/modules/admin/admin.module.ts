import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { MailModule } from '../../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { SellersModule } from '../sellers/sellers.module';

@Module({
  imports: [PrismaModule, RedisModule, MailModule, UsersModule, SellersModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}