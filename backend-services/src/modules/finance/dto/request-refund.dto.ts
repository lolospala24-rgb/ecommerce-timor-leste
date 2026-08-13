import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestRefundDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  // Omit for a full refund. A positive amount less than the payment's total
  // requests a partial refund instead.
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Type(() => Number)
  amount?: number;
}
