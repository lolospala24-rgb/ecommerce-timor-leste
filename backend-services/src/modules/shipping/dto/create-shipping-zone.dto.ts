import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShippingZoneDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id?: number;

  @IsString()
  @IsNotEmpty()
  zoneName: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  provinceId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  municipalityId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  courierId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  courierServiceId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  courierRateId?: number;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  municipality?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shippingCost: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedDeliveryDays?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minimumWeight?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maximumWeight?: number;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;
}
