// placeholder for src/modules/admin/dto/system-settings.dto.ts
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, Min, Max } from 'class-validator';

export class SystemSettingsDto {
  @IsString()
  @IsOptional()
  siteName?: string;

  @IsString()
  @IsOptional()
  siteDescription?: string;

  @IsString()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceFee?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  shippingCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  freeShippingThreshold?: number;

  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @IsBoolean()
  @IsOptional()
  registrationOpen?: boolean;

  @IsBoolean()
  @IsOptional()
  sellerVerificationRequired?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  maxProductImages?: number;

  @IsArray()
  @IsOptional()
  allowedImageTypes?: string[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  maxFileSize?: number;
}