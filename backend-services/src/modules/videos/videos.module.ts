import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { VideosRepository } from './videos.repository';
import { VideoScheduleJob } from './video-schedule.job';
import { PrismaModule } from '../../prisma/prisma.module';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [PrismaModule, CloudinaryModule, RedisModule],
  controllers: [VideosController],
  providers: [VideosService, VideosRepository, VideoScheduleJob],
  exports: [VideosService],
})
export class VideosModule {}
