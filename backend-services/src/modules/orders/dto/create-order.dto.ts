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

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  courierId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  courierServiceId?: number;

  // The exact shipping rate the customer selected at checkout (see
  // GET /shipping/options). Passed straight through to
  // ShippingService.calculateShippingCost so the charged rate is
  // unambiguous the moment a courier offers more than one method at the
  // same municipality — falling back to courierId + shippingMethod alone
  // previously ignored which method was actually picked.
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  shippingZoneId?: number;

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