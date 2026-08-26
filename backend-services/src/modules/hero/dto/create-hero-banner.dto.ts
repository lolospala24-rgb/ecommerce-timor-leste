import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHeroBannerDto {
  // Small pill label shown above the headline (e.g. "WELCOME TO LOLOSPALA").
  @IsString()
  @IsOptional()
  @MaxLength(60)
  badge?: string;

  // Rendered as the hero's headline on the storefront.
  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  subtitle?: string;

  // Call-to-action label (e.g. "Shop Now"); the frontend falls back to a
  // translated default when this is left blank.
  @IsString()
  @IsOptional()
  @MaxLength(40)
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
