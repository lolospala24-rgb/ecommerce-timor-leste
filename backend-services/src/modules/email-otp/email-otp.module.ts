import { Module } from '@nestjs/common';
import { EmailOtpService } from './email-otp.service';
import { EmailOtpController } from './email-otp.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [PrismaModule, RedisModule, MailModule],
  controllers: [EmailOtpController],
  providers: [EmailOtpService],
  exports: [EmailOtpService],
})
export class EmailOtpModule {}
