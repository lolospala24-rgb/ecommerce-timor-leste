import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { MailModule } from '../../mail/mail.module';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { CodStrategy } from './strategies/cod.strategy';
import { BankTransferStrategy } from './strategies/bank-transfer.strategy';

@Module({
  imports: [PrismaModule, RedisModule, MailModule, CloudinaryModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, CodStrategy, BankTransferStrategy],
  exports: [PaymentsService],
})
export class PaymentsModule {}