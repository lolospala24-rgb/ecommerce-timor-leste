import { Module } from '@nestjs/common';
import { PhoneVerificationService } from './phone-verification.service';
import { PhoneVerificationController } from './phone-verification.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { SMS_PROVIDER } from '../../common/sms/sms-provider.interface';
import { ConsoleSmsProvider } from '../../common/sms/console-sms.provider';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [PhoneVerificationController],
  providers: [
    PhoneVerificationService,
    // Only binding today — a real carrier gets wired in later purely by
    // changing this one provider, nothing else in the module needs to
    // change. ConsoleSmsProvider itself refuses to run under
    // NODE_ENV=production (see its own doc-comment), so there's no way to
    // accidentally ship this binding live.
    { provide: SMS_PROVIDER, useClass: ConsoleSmsProvider },
  ],
  exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
