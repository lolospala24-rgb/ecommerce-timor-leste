import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingStatus } from '@prisma/client';

// Generic receiving-side contract for a real courier's tracking webhook (or
// our own driver portal, which posts through the authenticated endpoint
// instead — see OrdersController.updateCourierLocation). Any external
// courier integrated later sends this same shape, authenticated by
// CourierWebhookGuard rather than a customer/staff JWT.
export class CourierWebhookDto {
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @IsEnum(ShippingStatus)
  @IsOptional()
  status?: ShippingStatus;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
