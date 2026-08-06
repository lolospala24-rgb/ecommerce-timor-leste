import { Module } from '@nestjs/common';
import { LocationsService, LocationsController } from './';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService, /* keep compatible with Provinces/Municipalities */],
})
export class LocationsModule {}
