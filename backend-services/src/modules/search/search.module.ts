import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { AiSearchService } from './ai-search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [SearchController],
  providers: [SearchService, AiSearchService],
  exports: [SearchService, AiSearchService],
})
export class SearchModule {}