// placeholder for src/modules/orders/dto/create-order.dto.ts
import {
  IsInt,
  IsEnum,
  IsString,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
  IsNumber,
  MaxLength,
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

  // Re-validated from scratch server-side against the customer's real cart
  // subtotal in OrdersService.create — nothing about the discount is ever
  // trusted from the client.
  @IsString()
  @IsOptional()
  couponCode?: string;

  // Checkout-only "pin exact location" override — see OrdersService.create's
  // delivery snapshot. Deliberately separate from Address.latitude/longitude:
  // this never gets written to the customer's saved Address, and never
  // feeds into shipping-fee calculation (that stays keyed on addressId's
  // municipality/province only). Falls back to the selected Address's own
  // latitude/longitude/reference when omitted.
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  deliveryLatitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  deliveryLongitude?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  deliveryReference?: string;
}