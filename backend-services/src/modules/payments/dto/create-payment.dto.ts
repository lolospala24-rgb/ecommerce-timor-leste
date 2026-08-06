// placeholder for src/modules/payments/dto/create-payment.dto.ts
import { IsInt, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  orderId: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;
}