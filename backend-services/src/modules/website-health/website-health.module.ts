import { Module } from '@nestjs/common';
import { WebsiteHealthController } from './website-health.controller';
import { WebsiteHealthService } from './website-health.service';
import { PageSpeedService } from './pagespeed.service';
import { SecurityAuditService } from './security-audit.service';
import { ScoreCalculatorService } from './score-calculator.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [WebsiteHealthController],
  providers: [WebsiteHealthService, PageSpeedService, SecurityAuditService, ScoreCalculatorService],
  exports: [ScoreCalculatorService],
})
export class WebsiteHealthModule {}
