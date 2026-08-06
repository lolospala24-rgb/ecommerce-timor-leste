import { IsNumber, Min, IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultShippingCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  freeShippingThreshold?: number;

  @IsOptional()
  @IsBoolean()
  enableFreeShipping?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDynamicShipping?: boolean;

  @IsOptional()
  @IsBoolean()
  enableLocalPickup?: boolean;

  @IsOptional()
  @IsString()
  defaultCourier?: string;

  @IsOptional()
  @IsString()
  defaultShippingMethod?: string;

  @IsArray()
  @IsOptional()
  shippingZones?: any[];
}
