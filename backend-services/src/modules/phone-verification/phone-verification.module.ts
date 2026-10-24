import { Module } from '@nestjs/common';
import { PhoneVerificationService } from './phone-verification.service';
import { PhoneVerificationController } from './phone-verification.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { SmsModule } from '../../common/sms/sms.module';

@Module({
  imports: [PrismaModule, RedisModule, SmsModule],
  controllers: [PhoneVerificationController],
  providers: [PhoneVerificationService],
  exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
