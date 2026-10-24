import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralPayoutJob } from './referral-payout.job';
import { ReferralsController } from './referrals.controller';
import { AdminReferralsController } from './admin-referrals.controller';
import { WalletController } from './wallet.controller';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SettingsModule, NotificationsModule],
  controllers: [ReferralsController, AdminReferralsController, WalletController],
  providers: [ReferralsService, ReferralPayoutJob],
  exports: [ReferralsService],
})
export class ReferralsModule {}
