import { Module } from '@nestjs/common';
import { QuickMenuService } from './quick-menu.service';
import { QuickMenuController } from './quick-menu.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, RedisModule, CloudinaryModule],
  controllers: [QuickMenuController],
  providers: [QuickMenuService],
  exports: [QuickMenuService],
})
export class QuickMenuModule {}
