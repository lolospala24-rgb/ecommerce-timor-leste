import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralPayoutJob } from './referral-payout.job';
import { ReferralsController } from './referrals.controller';
import { AdminReferralsController } from './admin-referrals.controller';
import { WalletController } from './wallet.controller';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SmsModule } from '../../common/sms/sms.module';
import { PhoneVerificationModule } from '../phone-verification/phone-verification.module';

@Module({
  // PhoneVerificationModule never depends back on ReferralsModule — this
  // stays one-directional. SmsModule is needed directly here too: this
  // service injects SMS_PROVIDER itself (to gate enabling the flag),
  // separately from PhoneVerificationService's own use of it to send.
  imports: [SettingsModule, NotificationsModule, SmsModule, PhoneVerificationModule],
  controllers: [ReferralsController, AdminReferralsController, WalletController],
  providers: [ReferralsService, ReferralPayoutJob],
  exports: [ReferralsService],
})
export class ReferralsModule {}
