import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHeroBannerDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  badge?: string;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  subtitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  comparePrice?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  buttonText?: string;

  // Internal path (e.g. "/products/some-slug") or a full URL — both valid,
  // so this isn't restricted to @IsUrl().
  @IsString()
  @IsOptional()
  @MaxLength(255)
  buttonUrl?: string;

  // Uploaded separately via POST /hero-banners/upload-image first, then its
  // returned URL is submitted here — same pattern as seller store logo/
  // banner and product images, not a multipart field on this endpoint.
  @IsString()
  desktopImage: string;

  @IsString()
  @IsOptional()
  mobileImage?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  position?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
