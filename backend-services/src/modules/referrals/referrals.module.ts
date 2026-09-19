import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { AdminReferralsController } from './admin-referrals.controller';
import { WalletController } from './wallet.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [ReferralsController, AdminReferralsController, WalletController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
