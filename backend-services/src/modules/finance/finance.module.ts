import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { MailModule } from '../../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, SettingsModule, MailModule, NotificationsModule],
  controllers: [FinanceController, RefundsController, PayoutsController],
  providers: [FinanceService, RefundsService, PayoutsService],
  exports: [FinanceService, RefundsService, PayoutsService],
})
export class FinanceModule {}
