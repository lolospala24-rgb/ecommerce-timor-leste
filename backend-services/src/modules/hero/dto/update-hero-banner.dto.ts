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

export class UpdateHeroBannerDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  badge?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  title?: string;

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

  @IsString()
  @IsOptional()
  @MaxLength(255)
  buttonUrl?: string;

  @IsString()
  @IsOptional()
  desktopImage?: string;

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
