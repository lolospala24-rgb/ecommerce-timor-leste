// placeholder for src/modules/orders/dto/create-order.dto.ts
import {
  IsInt,
  IsEnum,
  IsString,
  IsOptional,
  IsNotEmpty,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  addressId: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  shippingFee?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  serviceFee?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}