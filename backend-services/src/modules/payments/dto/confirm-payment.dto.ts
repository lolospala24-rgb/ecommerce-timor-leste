// placeholder for src/modules/payments/dto/confirm-payment.dto.ts
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}