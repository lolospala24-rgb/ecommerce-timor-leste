import { Module } from '@nestjs/common';
import { MunicipalitiesService } from './municipalities.service';
import { MunicipalitiesController } from './municipalities.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MunicipalitiesService],
  controllers: [MunicipalitiesController],
  exports: [MunicipalitiesService],
})
export class MunicipalitiesModule {}
